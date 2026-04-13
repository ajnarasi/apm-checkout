# PRD: Cash App Pay Integration on Commerce Hub

| Field | Value |
|---|---|
| Commerce Hub API | v1.26.0302 (`POST /checkouts/v1/orders`) |
| CashApp API | v2 |
| Ucom API | v0.2.3 |
| SnapPay API | v3.0.9 |
| Pattern | Redirect-based Wallet |
| Generated | 2026-04-12 |
| Safety Checks | ALL PASS (6/6) |

**Status:** Draft -- Ready for Stakeholder Review
**Owner:** Commerce Hub APM Team
**Reviewers:** Ucom Platform Team, SnapPay Platform Team

---

## 1. Executive Summary

**APM:** Cash App Pay -- a digital wallet operated by Block, Inc. (formerly Square).

**Pattern:** Redirect-based Wallet. The customer is redirected to Cash App (or scans a QR code) to approve payment, then returned to the merchant site.

| Attribute | Value |
|---|---|
| Capabilities | Auth, Capture, Refund |
| Regions | US only |
| Currencies | USD |
| Channel | Web |

### Integration Flow

Cash App Pay uses a two-step flow that differs from single-call APMs:

1. **Customer Request** -- Commerce Hub calls the CashApp Customer Request API to create a payment session. CashApp returns redirect URLs (desktop, mobile) and a QR code URL. The order enters `PAYER_ACTION_REQUIRED` status.
2. **Customer Approval** -- The customer approves the payment in the Cash App. CashApp issues a `grant_id` (prefixed `GRG_*`).
3. **Payment Execution** -- Commerce Hub creates a payment using the `grant_id`. The transaction moves to `AUTHORIZED` or `CAPTURED` depending on the operation type.
4. **Capture / Refund** -- Standard post-auth operations against the `PWC_*` payment ID.

### Key Differentiators

- **Two-step auth:** Customer Request (GRR_*) followed by Payment (PWC_*), unlike single-call wallets.
- **Conditional routing:** `scope_id` resolves to either `merchantId` or `brandId` based on `ONE_TIME_PAYMENT` vs. `ON_FILE_PAYMENT` type.
- **HMAC signature required on payment calls:** Customer Request uses API key only; Payment requires API key + HMAC-SHA256 signature.
- **Single redirect URL:** CashApp uses one `redirect_url` for all outcomes. Success vs. cancellation is determined by query parameters appended by CashApp.

---

## 2. Commerce Hub API Mapping (Layer 1)

Full field-level mappings are documented in [`mapping-ch-to-cashapp.md`](mapping-ch-to-cashapp.md). The summary below covers field counts, key transforms, and critical mapping decisions.

### Auth Capability

Auth spans two CashApp API calls: Customer Request creation and Payment execution.

**Request: 11 fields mapped**

| CH Field | CashApp Field | Transform | Notes |
|---|---|---|---|
| `amount.total` | `request.actions[0].amount` | MULTIPLY_100 | 15.10 becomes 1510 |
| `amount.currency` | `request.actions[0].currency` | PASSTHROUGH | ISO-4217 |
| `transactionDetails.operationType` | `payment.capture` | MAP_ENUM | CAPTURE=true, AUTHORIZE=false |
| `paymentMethod.paymentToken.tokenData` | `payment.grant_id` | PASSTHROUGH | GRG_* grant ID |
| `merchantDetails.processorMerchantId` | `request.actions[0].scope_id` | SCOPE_TYPE_ROUTE | See Conditional Routing |
| `transactionProcessingDetails.transactionId` | `request.reference_id` | PASSTHROUGH | Also used as `idempotency_key` |
| `checkoutInteractions.returnUrls.successUrl` | `request.redirect_url` | PASSTHROUGH | Single URL for all outcomes |
| `checkoutInteractions.channel` | `request.channel` | MAP_ENUM | WEB=ONLINE, IN_APP=IN_APP |
| `merchantDetails.ProcessorMerchantKey` | `[header] apiKey` | AUTH_INJECT | HMAC input |
| `merchantDetails.ProcessorMerchantSecret` | `[header] secret` | AUTH_INJECT | HMAC input |

**Response: 10 fields mapped**

| CashApp Field | CH Field | Transform | Notes |
|---|---|---|---|
| `request.id` | `order.providerOrderId` | PASSTHROUGH | GRR_* Customer Request ID |
| `request.status` | `order.orderStatus` | MAP_ENUM | PENDING=PAYER_ACTION_REQUIRED, APPROVED=AUTHORIZED |
| `payment.id` | `paymentReceipt.processorResponseDetails.referenceNumber` | PASSTHROUGH | PWC_* Payment ID |
| `payment.amount` | `paymentReceipt.approvedAmount.total` | DIVIDE_100 | 1510 becomes 15.10 |
| `grant_id` | `paymentMethod.paymentSource.paymentToken.tokenData` | PASSTHROUGH | GRG_* |
| `request.auth_flow_triggers.desktop_url` | `checkoutInteractions.actions.url` | CUSTOM | Select desktop or mobile by device context |
| `request.auth_flow_triggers.qr_code_image_url` | `checkoutInteractions.actions.code` | PASSTHROUGH | QR code for scan-to-pay |
| `request.channel` | `checkoutInteractions.channel` | MAP_ENUM | ONLINE=WEB |
| `request.created_at` | `transactionProcessingDetails.transactionTimestamp` | PASSTHROUGH | ISO 8601 |
| `requester_profile.name` | `dynamicDescriptors.merchantName` | PASSTHROUGH | Display name |

### Capture Capability

Identical to Auth mapping. The sole difference: `transactionDetails.operationType` is set to `CAPTURE`, which maps `payment.capture` to `true`.

### Refund Capability

**Request: 4 fields mapped**

| CH Field | CashApp Field | Transform |
|---|---|---|
| `amount.total` | `refund.amount` | MULTIPLY_100 |
| `amount.currency` | `refund.currency` | PASSTHROUGH |
| `referenceTransactionDetails.referenceTransactionId` | `refund.payment_id` | PASSTHROUGH |
| `transactionProcessingDetails.transactionId` | `refund.reference_id` | PASSTHROUGH |

**Response: 2 fields mapped**

| CashApp Field | CH Field | Transform |
|---|---|---|
| `refund.id` | `paymentReceipt.processorResponseDetails.referenceNumber` | PASSTHROUGH |
| `refund.amount` | `paymentReceipt.approvedAmount.total` | DIVIDE_100 |

### Conditional Routing (SCOPE_TYPE_ROUTE)

| Payment Type | scope_id Source | amount | account_ref_id |
|---|---|---|---|
| ONE_TIME_PAYMENT | `boarding_config.cashapp.merchantId` | Required | Not used |
| ON_FILE_PAYMENT | `boarding_config.cashapp.brandId` | Suppressed | Required |

The routing decision is determined by the `payment_type` field in the merchant boarding configuration. The connector evaluates this before constructing the Customer Request payload.

### Auth Scheme

| Endpoint | Scheme | Details |
|---|---|---|
| Customer Request | API_KEY only | `Authorization: Client {CLIENT_ID}` |
| Payment / Refund | API_KEY + HMAC_SIGNATURE | HMAC-SHA256 over request body, transmitted in `X-Signature` header |

Extension point `cashapp-signature-handler` (scope: `AUTH_HEADER_ONLY`) allows custom signature logic without modifying the core connector.

---

## 3. Ucom Adapter Specification (Layer 2)

Full specification in [`adapter-spec-ucom.md`](adapter-spec-ucom.md).

### Endpoint Mapping

| Ucom Endpoint | Commerce Hub Endpoint |
|---|---|
| `POST /v1/payments/auths` | `POST /checkouts/v1/orders` (auth) |
| `POST /v1/payments/auths/{fdAuthorizationId}/captures` | `POST /checkouts/v1/orders` (capture) |
| `POST /v1/payments/auths/{fdAuthorizationId}/refunds` | `POST /checkouts/v1/orders` (refund) |

### Merchant Experience

Ucom merchants call their existing `POST /v1/payments/auths` endpoint with `fundingSource.type="CASHAPP"` and pass a `cashApp.grantId`. **Zero code changes required on the merchant side.** The adapter handles all translation to Commerce Hub.

### Auth Bridging

Ucom and Commerce Hub use different HMAC credential sets. The adapter must:

1. Map Ucom `Api-Key` to Commerce Hub `Api-Key` via credential vault lookup
2. Add `Auth-Token-Type: HMAC` header (absent in Ucom requests)
3. Recompute HMAC-SHA256 signature using Commerce Hub credentials and the translated request body
4. Preserve `Client-Request-Id` and `Timestamp` for end-to-end traceability

### Schema Changes Required

**1. Enum addition:** Add `CASHAPP` to `FundingSourceType` (alongside CREDIT, DEBIT, PREPAID, PAYPAL, APPLEPAY, GOOGLEPAY).

**2. New CashApp object in FundingSource:**

```yaml
CashApp:
  type: object
  properties:
    grantId:
      type: string
      description: Cash App grant ID from Customer Request flow
    redirectUrl:
      type: string
      description: URL to redirect customer for Cash App approval (response only)
      readOnly: true
    qrCodeUrl:
      type: string
      description: QR code URL for scan-to-pay (response only)
      readOnly: true
```

### Ucom Team Action Items

| # | Action | Owner | Dependency |
|---|---|---|---|
| 1 | Add `CASHAPP` to `FundingSourceType` enum | Ucom Platform | None |
| 2 | Add `CashApp` object to `FundingSource` schema | Ucom Platform | Item 1 |
| 3 | Deploy CashApp adapter to staging | Commerce Hub APM | Items 1-2 |
| 4 | Update Ucom developer documentation | Ucom Platform | Item 2 |

### Error Code Mapping

| CH Error | CH HTTP | Ucom Error | Ucom HTTP |
|---|---|---|---|
| INVALID_REQUEST | 400 | BadRequest | 400 |
| AUTHENTICATION_ERROR | 401 | Unauthorized | 401 |
| RESOURCE_NOT_FOUND | 404 | NotFound | 404 |
| GATEWAY_ERROR | 500 | ServerError | 500 |
| PROVIDER_TIMEOUT | 504 | ServerError | 500 |
| RATE_LIMIT_EXCEEDED | 429 | TooManyRequests | 429 |
| VALIDATION_ERROR | 422 | UnprocessableEntity | 422 |

---

## 4. SnapPay Adapter Specification (Layer 2)

Full specification in [`adapter-spec-snappay.md`](adapter-spec-snappay.md).

### Domain Translation

SnapPay is a B2B payment platform. Its domain model requires significant translation to map onto Commerce Hub's consumer APM model.

| Concept | SnapPay Term | CH Term | Rule |
|---|---|---|---|
| Transaction type | `transactiontype` ("S"/"A") | `operationType` (CAPTURE/AUTHORIZE) | S=CAPTURE, A=AUTHORIZE |
| Payment mode | `paymentmode` (CC, ACH) | `paymentMethod.provider` | New value: CASHAPP |
| Amount | `transactionamount` (decimal) | `amount.total` (decimal) | No transform needed |
| Status | `status` ("Y"/"N") | `transactionState` | AUTHORIZED="Y", DECLINED="N" |

### Endpoint Mapping

| SnapPay Endpoint | Commerce Hub Endpoint |
|---|---|
| `POST /api/interop/v3/GetRequestID` | `POST /checkouts/v1/orders` (auth) |
| `POST /api/interop/v3/charge` | `POST /checkouts/v1/orders` (capture) |
| `POST /api/interop/v3/refund` | `POST /checkouts/v1/orders` (refund) |

### Key Challenge: Combined Init + Charge Pattern

Unlike Ucom (which supports separate auth and capture calls), SnapPay's typical flow combines `GetRequestID` (init) + `charge` (capture) as two sequential calls. The adapter must maintain state between these calls to link the capture back to the original authorization via `referenceTransactionId`.

### Unmappable B2B Fields

9 SnapPay fields have no Commerce Hub equivalent:

| Field | Resolution |
|---|---|
| `companycode` | Store in adapter config, do not pass to CH |
| `branchplant` | Store in adapter config, do not pass to CH |
| `ordertype` (SO, PO) | Ignore; CH uses intent (AUTHORIZE/CAPTURE) |
| `supplier{}` | Not applicable for consumer APM; ignore |
| `clxstream[]` | Not applicable; SnapPay handles internally |
| `level3[]` | Partial map to `orderData.itemDetails[]` (best-effort) |
| `user.forcepasswordreset` | Not applicable for payment flow |
| `user.forcetermsandconditions` | Not applicable for payment flow |
| `adderpcustomerinsnappay` | Internal to SnapPay; ignore |

### Schema Changes Required

**1. Enum addition:** Add `CASHAPP` as a valid `paymentmode` value (alongside CC, ACH, DEBIT).

**2. New response fields:**

| Field | Type | Description |
|---|---|---|
| `redirecturl` | string | Customer redirect URL for CashApp approval |
| `qrcodeurl` | string | QR code URL for scan-to-pay |

### SnapPay Team Action Items

| # | Action | Owner | Dependency |
|---|---|---|---|
| 1 | Add `CASHAPP` as valid `paymentmode` | SnapPay Platform | None |
| 2 | Add `redirecturl` and `qrcodeurl` to transaction response | SnapPay Platform | Item 1 |
| 3 | Deploy CashApp adapter to staging | Commerce Hub APM | Items 1-2 |
| 4 | Configure adapter to handle unmappable B2B fields | Commerce Hub APM | Item 3 |

### Error Code Mapping

| CH Error | CH HTTP | SnapPay Status | SnapPay HTTP |
|---|---|---|---|
| INVALID_REQUEST | 400 | `status: "E"` (Bad Request) | 400 |
| AUTHENTICATION_ERROR | 401 | `status: "E"` (Unauthorized) | 401 |
| RESOURCE_NOT_FOUND | 404 | `status: "E"` (Not Found) | 404 |
| GATEWAY_ERROR | 500 | `status: "E"` (Server Error) | 500 |
| PROVIDER_TIMEOUT | 504 | `status: "E"` (Server Error) | 500 |
| VALIDATION_ERROR | 422 | `status: "E"` (Validation Failed) | 422 |

---

## 5. Transaction Lifecycle

### State Machine

```
[1. Merchant Initiates Payment]
    Merchant sends POST /checkouts/v1/orders (intent=AUTHORIZE)
    |
    v
[2. Customer Request Created]
    Commerce Hub calls CashApp Customer Request API
    CashApp returns: GRR_* request ID, redirect URLs, QR code URL
    orderStatus = PAYER_ACTION_REQUIRED
    |
    v
[3. Customer Redirected]
    Customer opens Cash App (redirect or QR scan)
    Approval window: ~60 minutes (governed by expires_at)
    |
    v
[4. Customer Approves]
    CashApp returns grant_id (GRG_*)
    Customer redirected back to merchant successUrl
    |
    v
[5. Payment Executed]
    Commerce Hub creates payment with grant_id
    CashApp returns: PWC_* payment ID
    transactionState = AUTHORIZED (if operationType=AUTHORIZE)
    transactionState = CAPTURED  (if operationType=CAPTURE)
    |
    v
[6. Capture] (if auth-only flow)
    Merchant sends POST /checkouts/v1/orders (operationType=CAPTURE)
    Commerce Hub captures payment on CashApp
    transactionState = CAPTURED
    |
    v
[7. Refund] (optional)
    Merchant sends POST /checkouts/v1/orders (refund)
    CashApp returns: PWCR_* refund ID
    transactionState = REFUNDED
```

### ID Prefixes

| Prefix | Object | Lifecycle Stage |
|---|---|---|
| GRR_* | Customer Request | Created at step 2 |
| GRG_* | Grant | Issued at step 4 (customer approval) |
| PWC_* | Payment | Created at step 5 |
| PWCR_* | Refund | Created at step 7 |

### Timing Constraints

| Constraint | Value | Source |
|---|---|---|
| Customer approval window | ~60 minutes | `request.expires_at` from Customer Request response |
| QR code refresh interval | Governed by `auth_flow_triggers.refreshes_at` | Connector handles transparently |
| Auth-to-capture window | No strict limit documented | CashApp API v2 docs |

---

## 6. Safety Check Results

Full report in [`safety-check-report.md`](safety-check-report.md).

| # | Check | Result | Details |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | MULTIPLY_100 (request) paired with DIVIDE_100 (response). 15.10 -> 1510 -> 15.10. No precision loss. |
| 2 | Currency Preservation | PASS | `amount.currency` uses PASSTHROUGH in both directions. ISO-4217 code is never modified. |
| 3 | ID Uniqueness | PASS_WITH_NOTE | `transactionId` maps to `reference_id`, `idempotency_key`, and `refund.reference_id`. No runtime ambiguity -- each target exists in a separate API call context. |
| 4 | Tier 1 Coverage | PASS | All Tier 1 fields mapped: `amount.total`, `amount.currency`, `operationType`, `transactionId`, `referenceNumber`, `approvedAmount.total`, `orderStatus`, `providerOrderId`. |
| 5 | Bidirectional Completeness | PASS | All critical fields have round-trip coverage. Request `amount.total` (MULTIPLY_100) paired with response `approvedAmount.total` (DIVIDE_100). |
| 6 | Return URL Validation | PASS | Single `redirect_url` mapped from `successUrl`. CashApp determines outcome via query parameters. |

**Overall: 5 PASS, 1 PASS_WITH_NOTE, 0 FAIL. No auto-remediation needed. No fields flagged for human review.**

---

## 7. Sandbox Testing Plan

### Prerequisites

- CashApp sandbox credentials (Client ID, API Key, Secret)
- Commerce Hub sandbox environment with CashApp connector deployed
- Merchant boarding configuration with `merchantId` and `brandId` populated

### Test 1: Auth -- Customer Request Creation

**Objective:** Verify Customer Request creation returns valid redirect URLs and QR code.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Send `POST /customer-request/v1/requests` to CashApp sandbox | HTTP 200 |
| 2 | Validate response contains `request.id` | Prefixed with `GRR_` |
| 3 | Validate `request.status` | `PENDING` |
| 4 | Validate `auth_flow_triggers` | Contains `desktop_url`, `mobile_url`, `qr_code_image_url` |
| 5 | Validate `expires_at` | ISO 8601 timestamp ~60 minutes from now |

### Test 2: Auth -- Payment (Simulated Customer Approval)

**Objective:** Verify payment execution after customer approval.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Simulate customer approval in CashApp sandbox | `grant_id` (GRG_*) issued |
| 2 | Send payment request with `grant_id` and HMAC signature | HTTP 200 |
| 3 | Validate `payment.id` | Prefixed with `PWC_` |
| 4 | Validate `payment.amount` | Matches requested amount (in cents) |
| 5 | Validate `payment.status` | `APPROVED` |

### Test 3: Capture

**Objective:** Verify capture of an authorized payment.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Complete auth flow (Tests 1-2) with `capture=false` | PWC_* payment in AUTHORIZED state |
| 2 | Send capture request with `capture=true` | HTTP 200 |
| 3 | Validate captured amount | Matches requested amount |
| 4 | Validate transaction state | `CAPTURED` |

### Test 4: Refund

**Objective:** Verify refund of a captured payment.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Complete auth + capture flow (Tests 1-3) | PWC_* payment in CAPTURED state |
| 2 | Send refund referencing original `PWC_*` payment ID | HTTP 200 |
| 3 | Validate `refund.id` | Prefixed with `PWCR_` |
| 4 | Validate refunded amount | Matches requested refund amount |

### Test 5: Conditional Routing

**Objective:** Verify `scope_id` resolution for both payment types.

| Scenario | scope_id | amount | account_ref_id | Expected |
|---|---|---|---|---|
| ONE_TIME_PAYMENT | `boarding_config.cashapp.merchantId` | Present | Omitted | Customer Request created with amount |
| ON_FILE_PAYMENT | `boarding_config.cashapp.brandId` | Suppressed | Present | Customer Request created without amount |

### Test 6: Amount Symmetry Validation

**Objective:** Verify lossless amount conversion across the full round trip.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Send Commerce Hub request with `amount.total` = 15.10 (decimal) | Request accepted |
| 2 | Verify CashApp receives `amount` = 1510 (cents) | MULTIPLY_100 applied correctly |
| 3 | Verify Commerce Hub response `approvedAmount.total` = 15.10 (decimal) | DIVIDE_100 applied correctly |
| 4 | Repeat with edge cases: 0.01, 999999.99, 100.00 | No precision loss on any value |

---

## 8. Unmappable Fields and Business Rules

Full inventory in [`unmappable-fields.md`](unmappable-fields.md).

### CashApp Fields With No Commerce Hub Equivalent

| CashApp Field | Type | Resolution | Action Required |
|---|---|---|---|
| `request.expires_at` | ISO 8601 | Log for monitoring abandoned flows | None -- connector logs internally |
| `request.origin.type` | string | Informational only (always "DIRECT" for API calls) | None -- do not map |
| `auth_flow_triggers.refreshes_at` | ISO 8601 | Connector handles QR refresh transparently | None -- internal to connector |
| `payment.account_ref_id` | string | Populate from boarding config for ON_FILE flows | Boarding config must include `account_ref_id` |

### Commerce Hub Fields With No CashApp Equivalent

| CH Field | Resolution | Rationale |
|---|---|---|
| `merchantDetails.storeId` | Not passed to CashApp | CashApp uses `scope_id` instead of store-level identifiers |
| `merchantDetails.terminalId` | Not applicable | CashApp is card-not-present; terminal IDs have no meaning |
| `customer.firstName` / `customer.lastName` | Not passed | CashApp manages customer identity internally |
| `billingAddress` | Not passed | CashApp handles address verification within its platform |
| `dynamicDescriptors.mcc` | Not passed | MCC is configured during CashApp boarding, not per-transaction |

### Business Rules

1. **Amount suppression for ON_FILE:** When `payment_type` = `ON_FILE_PAYMENT`, the `amount` field must be omitted from the Customer Request. Including it will cause a CashApp API error.

2. **HMAC required for payments only:** Customer Request creation uses API key authentication only. Payment and refund calls require HMAC-SHA256 signature. The connector's `cashapp-signature-handler` extension point handles this distinction.

3. **Single redirect URL:** Unlike some APMs that accept separate success/failure/cancel URLs, CashApp accepts a single `redirect_url`. The outcome is communicated via query parameters appended by CashApp on redirect.

4. **ID reuse as idempotency key:** `transactionProcessingDetails.transactionId` is used as both `reference_id` and `idempotency_key`. This is safe because each serves a distinct purpose in separate API call contexts (validated in Safety Check #3).

5. **QR code expiration:** The `qr_code_image_url` returned in `auth_flow_triggers` has a limited validity period governed by `refreshes_at`. Merchants implementing scan-to-pay must handle refresh or direct customers to the redirect URL as fallback.

---

*End of document. For field-level detail, refer to the linked mapping and specification files.*
