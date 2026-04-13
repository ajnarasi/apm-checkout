# PRD: Afterpay BNPL Integration via Commerce Hub

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: v2
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12T05:30:00Z
patternTemplate: server-bnpl-v1
goldenMappingSource: "NONE -- generated from BNPL template + provider API docs"
safetyChecksPassed: true
confidence: generated
```

---

## 1. Executive Summary

This PRD defines the integration of Afterpay Buy Now, Pay Later (BNPL) as an Alternative Payment Method (APM) through Commerce Hub's `POST /checkouts/v1/orders` endpoint (v1.26.0302).

**IMPORTANT: Generated from BNPL template -- no golden mapping exists. Confidence: generated. All mappings require human verification before production.**

**Scope**: Four transaction capabilities -- auth, capture, refund, and void -- across two launch regions (US, AU).

**Integration pattern**: Server-to-server with customer redirect to Afterpay checkout page. Unlike Klarna (embedded widget), the customer is redirected to `redirectCheckoutUrl` on Afterpay's domain to authorize the payment. Unlike card-based APMs, Afterpay requires line-item detail, shipping/billing addresses, and customer email as mandatory fields.

**Transaction flow**:

1. Create checkout (server-to-server) -- returns token + redirectCheckoutUrl
2. Customer redirected to Afterpay for authorization (client-side redirect)
3. Customer returns to merchant via redirectConfirmUrl or redirectCancelUrl
4. Auth or immediate capture using checkout token (server-to-server)
5. Capture after auth (full or partial)
6. Refund or void as needed

**Key differentiator vs. Klarna BNPL**: Three critical differences from the Klarna BNPL template:

1. **Amount Transform**: Unlike Klarna (MULTIPLY_100/DIVIDE_100), Afterpay uses string decimal amounts. Transform is NUMBER_TO_STRING/STRING_TO_NUMBER -- no multiplication needed. Commerce Hub sends 50.00 (number), Afterpay expects "50.00" (string).
2. **Checkout Flow**: Unlike Klarna (embedded widget), Afterpay redirects customer to redirectCheckoutUrl -- similar to CashApp's redirect pattern but with BNPL line items. Return URLs (redirectConfirmUrl, redirectCancelUrl) are mandatory.
3. **Address Fields**: Afterpay uses line1/area1/region/postcode. Klarna uses street_address/city/postal_code. Both map from Commerce Hub's standard address object.
4. **Line Item Price**: Afterpay items[].price is a Money object {amount: "20.00", currency: "USD"}. Klarna order_lines[].unit_price is integer 2000.

**BNPL-promoted fields**: Same as Klarna -- `orderData.itemDetails[]`, `shippingAddress`, `billingAddress`, `customer.email`, `customer.firstName`, `customer.lastName` are all promoted from Tier 2 to Tier 1.

**Safety checks**: All six safety checks pass. Amount symmetry is confirmed across all capabilities (NUMBER_TO_STRING on request, STRING_TO_NUMBER on response).

---

## 2. Commerce Hub API Mapping

The complete field-level mapping is documented in `mapping-ch-to-afterpay.md`. This section summarizes the key mapping characteristics.

### Mapping Summary by Capability

| Capability | Afterpay Endpoint | Request Fields | Response Fields | Key Transform |
|---|---|---|---|---|
| Auth (Checkout) | POST /v2/checkouts | 26 fields mapped | 3 fields mapped | NUMBER_TO_STRING for amounts |
| Auth (Deferred) | POST /v2/payments/auth | 2 fields mapped | 6 fields mapped | MAP_ENUM for status |
| Capture | POST /v2/payments/{orderId}/capture | 1 field mapped | 5 fields mapped | NUMBER_TO_STRING / STRING_TO_NUMBER |
| Refund | POST /v2/payments/{orderId}/refund | 4 fields mapped | 3 fields mapped | NUMBER_TO_STRING / STRING_TO_NUMBER |
| Void | POST /v2/payments/{orderId}/void | No body | HTTP 200 | State derived from response |

### BNPL-Promoted Fields (Tier 2 to Tier 1)

The following fields are optional for card-based APMs but mandatory for Afterpay BNPL:

- `orderData.itemDetails[]` -- line items with name, quantity, price (as Money object)
- `shippingAddress` -- full shipping address
- `billingAddress` -- full billing address
- `customer.email` -- primary customer identity for Afterpay
- `customer.firstName` / `customer.lastName` -- consumer identity
- `checkoutInteractions.returnUrls` -- redirect URLs (REQUIRED for Afterpay, unlike Klarna)

### Transform Rules

| Transform | Direction | Description |
|---|---|---|
| NUMBER_TO_STRING | Request (CH to Afterpay) | Convert number decimal to string decimal (50.00 to "50.00") |
| STRING_TO_NUMBER | Response (Afterpay to CH) | Convert string decimal to number decimal ("50.00" to 50.00) |
| PASSTHROUGH | Both | No modification |
| MAP_ENUM | Response | status: APPROVED to AUTHORIZED, DECLINED to DECLINED |
| CONCAT | Request | Combine firstName + lastName into single name field |

---

## 3. Ucom Adapter

### Schema Changes

| Change | Detail |
|---|---|
| FundingSourceType enum | Add `AFTERPAY` value |
| Afterpay FundingSource object | New object with `checkoutToken` (string), `redirectCheckoutUrl` (string, readOnly) |

### Field Mapping Chain (Ucom to Commerce Hub to Afterpay)

| Ucom Field | CH Field | Afterpay Field | Notes |
|---|---|---|---|
| requestedAmount | amount.total | amount.amount (NUMBER_TO_STRING) | Ucom and CH both use decimal; transform happens at CH-to-Afterpay boundary |
| purchaseInfo.itemDetails[] | orderData.itemDetails[] | items[] | Line-item passthrough; price becomes Money object |
| customer.email | customer.email | consumer.email | BNPL identity field |
| shippingAddress | shippingAddress | shipping | Structure mapping (different field names) |
| billingAddress | billingAddress | billing | Structure mapping (different field names) |

### Auth Bridging

Same pattern as CashApp and Klarna: HMAC recompute at the adapter boundary. No Afterpay-specific changes to the auth bridging logic. Afterpay auth uses HTTP Basic at the CH-to-Afterpay boundary.

### Key Challenge: Line-Item Support in Ucom

Same as Klarna: Afterpay requires itemized purchase data (items[]) for all transactions. Ucom's existing `purchaseInfo[]` must be populated. The additional complexity is that Afterpay's item price is a Money object (`{amount: "20.00", currency: "USD"}`), so the adapter must construct this object from the flat unitPrice + currency fields.

**Recommendation**: Same as Klarna -- audit the Ucom PurchaseInfo schema for field-level completeness. The Money object construction for item prices is additional work beyond what Klarna required.

---

## 4. SnapPay Adapter

### Natural Fit: Level 3 Data

SnapPay already supports Level 3 (L3) line-item data, which maps naturally to the Afterpay BNPL requirement.

| SnapPay Field | CH Field | Afterpay Field | Notes |
|---|---|---|---|
| level3[].description | orderData.itemDetails[].itemName | items[].name | Direct mapping |
| level3[].quantity | orderData.itemDetails[].quantity | items[].quantity | Direct mapping |
| level3[].unitCost | orderData.itemDetails[].amountComponents.unitPrice | items[].price.amount | NUMBER_TO_STRING at CH-to-Afterpay |
| level3[].totalAmount | orderData.itemDetails[].grossAmount | (computed from qty * price) | Afterpay computes line total |
| customer.email | customer.email | consumer.email | Direct mapping |
| customer.customername | customer.firstName + customer.lastName | consumer.givenNames + consumer.surname | SPLIT_ON_SPACE then direct |

### B2B Unmappable Fields

Same B2B unmappable fields as Klarna and CashApp. These SnapPay fields have no Afterpay equivalent and are dropped at the adapter boundary:

- `companycode` -- B2B company identifier
- `branchplant` -- B2B branch/plant code
- `supplier{}` -- supplier metadata
- `clxstream[]` -- CLX stream data

### Key Advantage

SnapPay's existing L3 data means the BNPL mapping is simpler for SnapPay than for Ucom. No schema extension is required on the SnapPay side. The adapter needs only the standard field-path mapping and the NUMBER_TO_STRING / STRING_TO_NUMBER transforms.

---

## 5. Transaction Lifecycle

### State Machine

```
[1. Create Checkout]
    POST /v2/checkouts
    orderStatus = PAYER_ACTION_REQUIRED
    Returns: token + redirectCheckoutUrl
    Merchant redirects customer to redirectCheckoutUrl

        |
        v

[2. Customer Authorizes]
    Client-side redirect to Afterpay
    Customer approves payment on Afterpay page
    Afterpay redirects customer to merchant.redirectConfirmUrl
    (or merchant.redirectCancelUrl if declined/cancelled)

        |
        v

[3a. Auth (Deferred)]              [3b. Immediate Capture]
    POST /v2/payments/auth              POST /v2/payments/capture
    token from checkout                 token from checkout
    transactionState = AUTHORIZED       transactionState = CAPTURED
    Returns: orderId, status            Returns: orderId, status

        |
        v
    +---+---+---+
    |           |
    v           v

[4a. Capture]                    [4b. Void]
    POST /v2/payments/               POST /v2/payments/
      {orderId}/capture                {orderId}/void
    transactionState = CAPTURED     transactionState = VOIDED
    Full or partial capture         Only for uncaptured orders
                                    HTTP 200 with updated order

        |
        v

[5. Refund]
    POST /v2/payments/{orderId}/refund
    Full or partial refund supported
    requestId for idempotency
    Only for captured orders
```

### State Transitions

| From State | Action | To State | Reversible |
|---|---|---|---|
| (none) | Create Checkout | PAYER_ACTION_REQUIRED | No (checkout expires) |
| PAYER_ACTION_REQUIRED | Customer Authorize + Auth | AUTHORIZED | No |
| PAYER_ACTION_REQUIRED | Immediate Capture | CAPTURED | Via refund only |
| AUTHORIZED | Capture (full) | CAPTURED | Via refund only |
| AUTHORIZED | Capture (partial) | PARTIALLY_CAPTURED | Additional captures possible |
| AUTHORIZED | Void | VOIDED | No |
| CAPTURED | Refund (partial) | PARTIALLY_REFUNDED | No |
| CAPTURED | Refund (full) | REFUNDED | No |

### Timing Constraints

- **Checkout expiry**: Afterpay checkouts expire if the customer does not authorize within the session window (typically minutes, not days)
- **Capture window**: Authorized orders should be captured promptly. Afterpay's auth window is shorter than Klarna's 28 days.
- **Refund window**: Refunds can be issued up to 120 days after capture

---

## 6. Safety Check Results

All safety checks passed. Full details in `safety-check-report.md`.

| # | Check | Status | Summary |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | NUMBER_TO_STRING on request, STRING_TO_NUMBER on response for all capabilities |
| 2 | Currency Preservation | PASS | ISO-4217 codes pass through with no modification |
| 3 | ID Uniqueness | PASS | Each Afterpay ID maps to exactly one CH field; no fan-out |
| 4 | Tier 1 Coverage | PASS | All Tier 1 and BNPL-promoted fields mapped |
| 5 | Bidirectional Completeness | PASS | Every request amount has a corresponding response amount |
| 6 | Return URL Validation | PASS | redirectConfirmUrl and redirectCancelUrl both mapped from CH returnUrls |

---

## 7. Sandbox Testing Plan

Mappings generated from BNPL template and provider API docs. Requires sandbox validation against Afterpay sandbox at `https://global-api-sandbox.afterpay.com`.

### Test Cases

| # | Test | Endpoint | Expected Result | Sandbox Status |
|---|---|---|---|---|
| 1 | Checkout creation with full line items | POST /v2/checkouts | 200 OK with token and redirectCheckoutUrl | Pending |
| 2 | Checkout creation WITHOUT line items | POST /v2/checkouts | 400 or 422 in production; test sandbox fidelity | Pending |
| 3 | Deferred auth with checkout token | POST /v2/payments/auth | 200 OK with orderId and status | Requires completed checkout |
| 4 | Immediate capture with checkout token | POST /v2/payments/capture | 200 OK with orderId and APPROVED status | Requires completed checkout |
| 5 | Capture after auth | POST /v2/payments/{orderId}/capture | 200 OK with captured amount | Requires completed auth |
| 6 | Partial refund of captured order | POST /v2/payments/{orderId}/refund | 200 OK with refundId | Requires completed capture |
| 7 | Void of authorized uncaptured order | POST /v2/payments/{orderId}/void | 200 OK with voided order | Requires completed auth |
| 8 | Amount symmetry round-trip | Checkout + capture + read | Send 50.00 (CH) -> verify Afterpay receives "50.00" -> verify response returns 50.00 | Pending |

### Sandbox Configuration

| Property | Value |
|---|---|
| Base URL | https://global-api-sandbox.afterpay.com |
| Auth | HTTP Basic with sandbox credentials |
| Test country | US (for launch region testing) |
| Test currency | USD |

### Test Dependencies

Tests 3-7 require a completed checkout flow, which depends on customer interaction with the Afterpay redirect checkout page. Sandbox testing for these capabilities requires either:

- Afterpay-provided test flow that auto-approves checkout, or
- Manual testing through the redirect flow with sandbox test credentials

---

## 8. Unmappable Fields

Full details in `unmappable-fields.md`. Summary below.

### Afterpay Fields With No Commerce Hub Equivalent (6 fields)

| Field | Impact | Resolution |
|---|---|---|
| expires | Low | Log checkout expiry timestamp for monitoring |
| events[] | Low | Payment event log -- log for audit trail |
| agreements[] | None | Afterpay terms acceptance tracking |
| paymentScheduleChecksum | None | Installment schedule verification hash |
| orderDetails.consumer.phoneNumber | Low | Afterpay may enrich consumer data in response |
| orderDetails.merchant | None | Afterpay merchant metadata in response |

### Commerce Hub Fields With No Afterpay Equivalent (7 fields)

| Field | Impact | Resolution |
|---|---|---|
| merchantDetails.storeId | Low | Afterpay uses account-level merchant ID |
| merchantDetails.terminalId | None | Not applicable for e-commerce |
| transactionDetails.captureFlag | Low | Afterpay uses separate auth vs. immediate capture endpoints |
| encryptionData | None | Not applicable for BNPL |
| splitShipment | Low | Workaround: partial capture |
| dynamicDescriptors.mcc | Low | Afterpay manages MCC at account level |
| amountComponents.taxAmounts | Low | Afterpay does not require order-level tax; only per-item if provided |

No unmappable field blocks the integration. All gaps have documented resolutions or workarounds.
