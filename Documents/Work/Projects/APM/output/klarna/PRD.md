# PRD: Klarna BNPL Integration via Commerce Hub

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: v1
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12
patternTemplate: server-bnpl-v1
goldenMappingSource: sandbox-validated-mapping
safetyChecksPassed: true
```

---

## 1. Executive Summary

This PRD defines the integration of Klarna Buy Now, Pay Later (BNPL) as an Alternative Payment Method (APM) through Commerce Hub's `POST /checkouts/v1/orders` endpoint (v1.26.0302).

**Scope**: Four transaction capabilities -- auth, capture, partial-refund, and cancel -- across four launch regions (US, UK, DE, FR), with expansion potential to 16 Klarna-supported countries.

**Integration pattern**: Server-to-server with an embedded Klarna JS SDK widget for customer authorization. Unlike redirect-based APMs, the customer never leaves the merchant page. Unlike card-based APMs, Klarna requires line-item detail, shipping/billing addresses, and customer email as mandatory fields.

**Transaction flow**:

1. Create payment session (server-to-server)
2. Customer authorizes via Klarna widget (client-side)
3. Place order using auth_token (server-to-server)
4. Capture (full or partial, with line-item granularity)
5. Refund or cancel as needed

**Key differentiator vs. card-based APMs**: Klarna mandates `orderData.itemDetails[]` (order_lines), full shipping/billing address, and `customer.email`. These fields are promoted from Tier 2 to Tier 1 for BNPL, which has upstream implications for both the Ucom and SnapPay adapters.

**Safety checks**: All six safety checks pass. Amount symmetry is confirmed across all capabilities (MULTIPLY_100 on request, DIVIDE_100 on response).

---

## 2. Commerce Hub API Mapping

The complete field-level mapping is documented in `mapping-ch-to-klarna.md`. This section summarizes the key mapping characteristics.

### Mapping Summary by Capability

| Capability | Klarna Endpoint | Request Fields | Response Fields | Key Transform |
|---|---|---|---|---|
| Auth (Session) | POST /payments/v1/sessions | 24 fields mapped | 3 fields mapped | MULTIPLY_100 for all amounts |
| Auth (Place Order) | POST /payments/v1/authorizations/{auth_token}/order | Same as session | 3 fields mapped | MAP_ENUM for fraud_status |
| Capture | POST /ordermanagement/v1/orders/{order_id}/captures | 3 fields mapped | 2 fields mapped | MULTIPLY_100 / DIVIDE_100 |
| Partial Refund | POST /ordermanagement/v1/orders/{order_id}/refunds | 3 fields mapped | 2 fields mapped | MULTIPLY_100 / DIVIDE_100 |
| Cancel | POST /ordermanagement/v1/orders/{order_id}/cancel | No body | HTTP 204 | State derived from status code |

### BNPL-Promoted Fields (Tier 2 to Tier 1)

The following fields are optional for card-based APMs but mandatory for Klarna BNPL:

- `orderData.itemDetails[]` -- line items with name, quantity, unit_price, total_amount, tax
- `shippingAddress` -- full shipping address with given_name and family_name
- `billingAddress` -- full billing address
- `customer.email` -- primary customer identity for Klarna

### Transform Rules

| Transform | Direction | Description |
|---|---|---|
| MULTIPLY_100 | Request (CH to Klarna) | Convert decimal to minor units (50.00 to 5000) |
| DIVIDE_100 | Response (Klarna to CH) | Convert minor units to decimal (5000 to 50.00) |
| PASSTHROUGH | Both | No modification |
| MAP_ENUM | Response | fraud_status: ACCEPTED to AUTHORIZED, PENDING to PENDING, REJECTED to DECLINED |
| SAME_FORMAT | Request | Array structure preserved (order_lines mirrors itemDetails) |

---

## 3. Ucom Adapter

### Schema Changes

| Change | Detail |
|---|---|
| FundingSourceType enum | Add `KLARNA` value |
| Klarna FundingSource object | New object with `sessionId` (string), `clientToken` (string), `paymentMethodCategory` (string) |

### Field Mapping Chain (Ucom to Commerce Hub to Klarna)

| Ucom Field | CH Field | Klarna Field | Notes |
|---|---|---|---|
| requestedAmount | amount.total | order_amount (MULTIPLY_100) | Ucom and CH both use decimal; transform happens at CH-to-Klarna boundary |
| purchaseInfo.itemDetails[] | orderData.itemDetails[] | order_lines[] | Line-item passthrough |
| customer.email | customer.email | shipping_address.email | BNPL identity field |
| shippingAddress | shippingAddress | shipping_address | Structure mapping |
| billingAddress | billingAddress | billing_address | Structure mapping |

### Auth Bridging

Same pattern as CashApp: HMAC recompute at the adapter boundary. No Klarna-specific changes to the auth bridging logic.

### Key Challenge: Line-Item Support in Ucom

Klarna requires itemized purchase data (order_lines) for all transactions. The current Ucom schema may not fully support line-item detail in the FundingSource or PurchaseInfo object at the granularity Klarna requires (unit_price, total_tax_amount, total_discount_amount per line).

**Recommendation**: Audit the Ucom PurchaseInfo schema for field-level completeness against Klarna order_lines requirements. If gaps exist, extend the Ucom schema to support per-line-item tax and discount amounts. This is a prerequisite for Klarna go-live through the Ucom path.

---

## 4. SnapPay Adapter

### Natural Fit: Level 3 Data

SnapPay already supports Level 3 (L3) line-item data, which maps naturally to the Klarna BNPL requirement.

| SnapPay Field | CH Field | Klarna Field | Notes |
|---|---|---|---|
| level3[].description | orderData.itemDetails[].itemName | order_lines[].name | Direct mapping |
| level3[].quantity | orderData.itemDetails[].quantity | order_lines[].quantity | Direct mapping |
| level3[].unitCost | orderData.itemDetails[].amountComponents.unitPrice | order_lines[].unit_price | MULTIPLY_100 at CH-to-Klarna |
| level3[].totalAmount | orderData.itemDetails[].grossAmount | order_lines[].total_amount | MULTIPLY_100 at CH-to-Klarna |
| customer.email | customer.email | shipping_address.email | Direct mapping |
| customer.firstName | shippingAddress.firstName | shipping_address.given_name | Direct mapping |
| customer.lastName | shippingAddress.lastName | shipping_address.family_name | Direct mapping |

### B2B Unmappable Fields

Same B2B unmappable fields as CashApp. These SnapPay fields have no Klarna equivalent and are dropped at the adapter boundary:

- `companycode` -- B2B company identifier
- `branchplant` -- B2B branch/plant code
- `supplier{}` -- supplier metadata
- `clxstream[]` -- CLX stream data

### Key Advantage

SnapPay's existing L3 data means the BNPL mapping is simpler for SnapPay than for Ucom. No schema extension is required on the SnapPay side. The adapter needs only the standard field-path mapping and the MULTIPLY_100 / DIVIDE_100 transforms.

---

## 5. Transaction Lifecycle

### State Machine

```
[1. Session Create]
    POST /payments/v1/sessions
    orderStatus = PAYER_ACTION_REQUIRED
    Returns: client_token + session_id
    Merchant initializes Klarna JS SDK with client_token

        |
        v

[2. Customer Authorizes]
    Client-side: Klarna widget interaction
    Customer approves payment in embedded widget
    Returns: auth_token (to merchant frontend)

        |
        v

[3. Place Order]
    POST /payments/v1/authorizations/{auth_token}/order
    transactionState = AUTHORIZED
    Returns: order_id (used for all subsequent operations)
    fraud_status mapped: ACCEPTED->AUTHORIZED, PENDING->PENDING, REJECTED->DECLINED

        |
        v
    +---+---+---+
    |           |
    v           v

[4a. Capture]                    [4b. Cancel]
    POST /ordermanagement/          POST /ordermanagement/
      v1/orders/{order_id}/           v1/orders/{order_id}/
      captures                        cancel
    transactionState = CAPTURED     transactionState = VOIDED
    Partial capture supported       Only for uncaptured orders
    (subset of order_lines)         HTTP 204 No Content

        |
        v

[5. Partial Refund]
    POST /ordermanagement/v1/orders/{order_id}/refunds
    Partial amount supported
    Can specify which order_lines are being refunded
    Only for captured orders
```

### State Transitions

| From State | Action | To State | Reversible |
|---|---|---|---|
| (none) | Session Create | PAYER_ACTION_REQUIRED | No (session expires) |
| PAYER_ACTION_REQUIRED | Customer Authorize + Place Order | AUTHORIZED | No |
| AUTHORIZED | Capture (full) | CAPTURED | Via refund only |
| AUTHORIZED | Capture (partial) | PARTIALLY_CAPTURED | Additional captures or cancel remainder |
| AUTHORIZED | Cancel | VOIDED | No |
| CAPTURED | Partial Refund | PARTIALLY_REFUNDED | No |
| CAPTURED | Full Refund | REFUNDED | No |

### Timing Constraints

- **Session expiry**: Klarna sessions expire after 48 hours if the customer does not authorize
- **Capture window**: Orders must be captured within 28 days of authorization (configurable per merchant)
- **Refund window**: Refunds can be issued up to 365 days after capture

---

## 6. Safety Check Results

All safety checks passed. Full details in `safety-check-report.md`.

| # | Check | Status | Summary |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | MULTIPLY_100 on request, DIVIDE_100 on response for all capabilities |
| 2 | Currency Preservation | PASS | ISO-4217 codes pass through with no modification |
| 3 | ID Uniqueness | PASS | Each Klarna ID maps to exactly one CH field; no fan-out |
| 4 | Tier 1 Coverage | PASS | All Tier 1 and BNPL-promoted fields mapped |
| 5 | Bidirectional Completeness | PASS | Every request amount has a corresponding response amount |
| 6 | Return URL Validation | N/A | Server-to-server pattern; no redirects |

---

## 7. Sandbox Testing Plan

Golden mapping validated against Klarna sandbox at `api-na.playground.klarna.com`.

### Test Cases

| # | Test | Endpoint | Expected Result | Sandbox Status |
|---|---|---|---|---|
| 1 | Session creation with full line items | POST /payments/v1/sessions | 200 OK with session_id and client_token | Validated |
| 2 | Session creation WITHOUT line items | POST /payments/v1/sessions | 400 Bad Request in production; test sandbox fidelity | Pending |
| 3 | Session read | GET /payments/v1/sessions/{session_id} | 200 OK with session details | Validated |
| 4 | Capture with full amount | POST /ordermanagement/v1/orders/{order_id}/captures | 201 Created with capture_id | Requires completed auth |
| 5 | Partial refund of captured order | POST /ordermanagement/v1/orders/{order_id}/refunds | 201 Created with refund_id | Requires completed capture |
| 6 | Cancel of authorized uncaptured order | POST /ordermanagement/v1/orders/{order_id}/cancel | 204 No Content | Requires completed auth |
| 7 | Amount symmetry round-trip | Session create + session read | Send 50.00 (CH) -> verify Klarna receives 5000 -> verify response returns 50.00 | Validated |

### Sandbox Configuration

| Property | Value |
|---|---|
| Base URL | api-na.playground.klarna.com |
| Auth | HTTP Basic with sandbox credentials |
| Test country | US (for launch region testing) |
| Test currency | USD |

### Test Dependencies

Tests 4, 5, and 6 require a completed authorization flow, which depends on customer interaction with the Klarna widget. Sandbox testing for these capabilities requires either:

- A Klarna-provided test flow that auto-approves authorization, or
- Manual testing through a hosted checkout page with the Klarna JS SDK initialized

---

## 8. Unmappable Fields

Full details in `unmappable-fields.md`. Summary below.

### Klarna Fields With No Commerce Hub Equivalent (4 fields)

| Field | Impact | Resolution |
|---|---|---|
| payment_method_categories[].asset_urls | Low | Pass to merchant out-of-band for UI rendering |
| authorized_payment_method.number_of_installments | Low | Log for reporting; consider future CH schema extension |
| order.initial_payment_method | Low | Informational only |
| merchant_urls (terms, checkout, confirmation, push) | None | KCO-specific; not used in Payments API flow |

### Commerce Hub Fields With No Klarna Equivalent (7 fields)

| Field | Impact | Resolution |
|---|---|---|
| merchantDetails.storeId | Low | Klarna uses account-level merchant ID |
| merchantDetails.terminalId | None | Not applicable for e-commerce |
| transactionDetails.captureFlag | Low | Klarna uses separate auth/capture endpoints |
| checkoutInteractions.returnUrls | None | Widget-based, not redirect-based |
| encryptionData | None | Not applicable for BNPL |
| splitShipment | Low | Workaround: partial capture with order_lines subset |
| dynamicDescriptors.mcc | Low | Klarna manages MCC at account level |

No unmappable field blocks the integration. All gaps have documented resolutions or workarounds.
