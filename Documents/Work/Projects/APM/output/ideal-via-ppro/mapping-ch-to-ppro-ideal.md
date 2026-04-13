# iDEAL via PPRO -- Commerce Hub Field Mapping

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: PPRO v1
aggregator: PPRO
targetApm: iDEAL
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12T07:02:00Z
patternTemplate: bank-redirect-v1
goldenMappingSource: "NONE -- generated from sandbox discovery"
confidence: generated
safetyChecksPassed: true
sandboxValidated: true
```

---

## Integration Pattern

| Property | Value |
|---|---|
| APM Provider | iDEAL (via PPRO aggregator) |
| Aggregator | PPRO |
| Pattern | Bank Redirect |
| Commerce Hub Endpoint | POST /checkouts/v1/orders |
| PPRO Endpoint | POST /v1/payment-charges |
| Capabilities | auth, capture, refund, void |
| Region | NL (Netherlands) |
| Currency | EUR |
| Channel | web (ECOMMERCE) |
| Auth Scheme | Bearer token + Merchant-Id header |
| Sandbox | https://api.sandbox.eu.ppro.com |

---

## Auth Capability -- Create Payment Charge

**PPRO Endpoint**: `POST /v1/payment-charges`

The merchant sends a standard Commerce Hub auth request. Commerce Hub translates to the PPRO payment charge format. PPRO routes to iDEAL based on the `paymentMethod: "IDEAL"` field and returns a redirect URL for customer bank authentication.

### Request Mapping (Commerce Hub to PPRO)

| CH Field Path | CH Type | PPRO Field Path | PPRO Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number (decimal) | amount.value | integer (minor units) | MULTIPLY_100 | 1 | CH 10.00 becomes PPRO 1000 |
| amount.currency | string | amount.currency | string | PASSTHROUGH | 1 | ISO 4217; "EUR" for iDEAL |
| customer.firstName + customer.lastName | string + string | consumer.name | string | CONCAT | 1 | "John" + " " + "Doe" -> "John Doe" |
| customer.email | string | consumer.email | string | PASSTHROUGH | 1 | Required by PPRO |
| customerAddress.country | string | consumer.country | string | PASSTHROUGH | 1 | ISO 3166-1 alpha-2; "NL" for iDEAL |
| paymentMethod.provider | string | paymentMethod | string | MAP_ENUM + UPPER | 1 | Must be uppercase "IDEAL" |
| transactionDetails.captureFlag | boolean | autoCapture | boolean | PASSTHROUGH | 1 | true=immediate capture, false=auth-only |
| checkoutInteractions.returnUrls.successUrl | string | authenticationSettings[0].settings.returnUrl | string | PASSTHROUGH | 1 | Customer redirect URL after bank auth |
| checkoutInteractions.actions.type | string | authenticationSettings[0].type | string | MAP_ENUM | 1 | WEB_REDIRECTION -> "REDIRECT" |
| transactionDetails.merchantOrderId | string | merchantPaymentChargeReference | string | PASSTHROUGH | 1 | Merchant order reference |

### Response Mapping (PPRO to Commerce Hub)

| PPRO Field Path | PPRO Type | CH Field Path | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| id | string | transactionProcessingDetails.transactionId | string | PASSTHROUGH | 1 | e.g., "charge_oc43q4PDbViOlkzoweDXQ" |
| status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | See status enum mapping below |
| instrumentId | string | paymentMethod.paymentToken.tokenData | string | PASSTHROUGH | 2 | e.g., "instr_13qSCuBpkdyoue9ktrtN6" |
| authenticationMethods[0].details.requestUrl | string | checkoutInteractions.actions.url | string | PASSTHROUGH | 1 | Bank redirect URL for customer |
| authenticationMethods[0].type | string | checkoutInteractions.actions.type | string | MAP_ENUM | 1 | "REDIRECT" -> WEB_REDIRECTION |
| authorizations[0].id | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | e.g., "authz_eFTkW5acr2THRcKGaU0PV" |
| authorizations[0].amount | integer | paymentReceipt.approvedAmount.total | number (decimal) | DIVIDE_100 | 1 | PPRO 1000 becomes CH 10.00 |
| currency | string | paymentReceipt.approvedAmount.currency | string | PASSTHROUGH | 1 | "EUR" |
| merchantPaymentChargeReference | string | transactionDetails.merchantOrderId | string | PASSTHROUGH | 1 | Echoed merchant reference |

### Status Enum Mapping (PPRO to Commerce Hub)

| PPRO Status | CH transactionState |
|---|---|
| AUTHENTICATION_PENDING | PAYER_ACTION_REQUIRED |
| AUTHORIZED | AUTHORIZED |
| CAPTURED | CAPTURED |
| REFUNDED | REFUNDED |
| VOIDED | VOIDED |
| AUTHENTICATION_FAILED | DECLINED |

### Authentication Type Enum Mapping

| CH actions.type | PPRO authenticationSettings.type |
|---|---|
| WEB_REDIRECTION | REDIRECT |
| QR_CODE | SCAN_CODE |

---

## Capture Capability

**PPRO Endpoint**: `POST /v1/payment-charges/{chargeId}/captures`

Captures an authorized iDEAL payment. Supports both full and partial capture amounts.

### Request Mapping (Commerce Hub to PPRO)

| CH Field Path | CH Type | PPRO Field Path | PPRO Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number (decimal) | amount.value | integer (minor units) | MULTIPLY_100 | 1 | Capture amount |
| referenceTransactionDetails.referenceTransactionId | string | {chargeId} in URL path | string | PATH_PARAM | 1 | PPRO charge ID from auth response |

### Response Mapping (PPRO to Commerce Hub)

| PPRO Field Path | PPRO Type | CH Field Path | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| captures[0].id | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | Capture reference ID |
| captures[0].amount | integer | paymentReceipt.approvedAmount.total | number (decimal) | DIVIDE_100 | 1 | Captured amount |
| status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | CAPTURED -> CAPTURED |

---

## Refund Capability

**PPRO Endpoint**: `POST /v1/payment-charges/{chargeId}/refunds`

Refunds a captured iDEAL payment. Supports both full and partial refund amounts.

### Request Mapping (Commerce Hub to PPRO)

| CH Field Path | CH Type | PPRO Field Path | PPRO Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number (decimal) | amount.value | integer (minor units) | MULTIPLY_100 | 1 | Refund amount (partial OK) |
| referenceTransactionDetails.referenceTransactionId | string | {chargeId} in URL path | string | PATH_PARAM | 1 | PPRO charge ID |

### Response Mapping (PPRO to Commerce Hub)

| PPRO Field Path | PPRO Type | CH Field Path | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| refunds[0].id | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | Refund reference ID |
| refunds[0].amount | integer | paymentReceipt.refundedAmount.total | number (decimal) | DIVIDE_100 | 1 | Refunded amount |
| status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | REFUNDED -> REFUNDED |

---

## Partial Refund Capability

### Partial Refund Capability

**PPRO Endpoint**: POST /v1/payment-charges/{chargeId}/refunds (same endpoint as full refund, partial amount)

**Request Mapping (CH → PPRO)**:

| CH Field Path | CH Type | PPRO Field Path | PPRO Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `amount.total` | number (decimal) | `amount.value` | integer (minor units) | MULTIPLY_100 | 1 | Partial refund amount (less than captured) |
| `amount.currency` | string | `amount.currency` | string | PASSTHROUGH | 1 | Must match original currency |
| `referenceTransactionDetails.referenceTransactionId` | string | `{chargeId}` in URL path | string | PASSTHROUGH | 1 | Original charge ID |
| `transactionDetails.merchantOrderId` | string | `merchantPaymentChargeReference` | string | PASSTHROUGH | 2 | Refund reference |

**Response Mapping (PPRO → CH)**:

| PPRO Field | PPRO Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `refundId` | string | `paymentReceipt.processorResponseDetails.referenceNumber` | string | PASSTHROUGH | 1 | PPRO refund ID |
| `amount.value` | integer | `paymentReceipt.approvedAmount.total` | number | DIVIDE_100 | 1 | Partial refund amount |
| `amount.currency` | string | `paymentReceipt.approvedAmount.currency` | string | PASSTHROUGH | 1 | |
| HTTP 201/204 | — | `gatewayResponse.transactionState` | string | MAP_ENUM | 1 | → REFUNDED |

> **Note**: Partial refund uses the SAME PPRO endpoint as full refund. The only difference is the `amount.value` is less than the captured amount. Multiple partial refunds are allowed until the total refunded equals the captured amount.

---

## Void Capability

**PPRO Endpoint**: `POST /v1/payment-charges/{chargeId}/voids`

Voids an authorized but uncaptured iDEAL payment. No request body required.

### Request

No field mapping required beyond the charge ID as a path parameter.

| CH Field Path | PPRO Field Path | Transform | Notes |
|---|---|---|---|
| referenceTransactionDetails.referenceTransactionId | {chargeId} in URL path | PATH_PARAM | PPRO charge ID |

### Response

| PPRO Behavior | CH Field | CH Value | Notes |
|---|---|---|---|
| status = VOIDED | gatewayResponse.transactionState | VOIDED | State derived from PPRO status |

---

## Cancel Capability

### Cancel Capability

**PPRO Endpoint**: POST /v1/payment-charges/{chargeId}/voids (same as void — cancel is void on authorized-but-uncaptured)

**Request Mapping**: Same as Void. No request body required — just the `chargeId` in the URL path.

**Response Mapping**: Same as Void → `gatewayResponse.transactionState` = "VOIDED"

> **Note**: In PPRO's API model, "cancel" and "void" use the same endpoint (`/voids`). Cancel applies to authorized-but-uncaptured payments. Commerce Hub distinguishes cancel (merchant-initiated before capture) from void (system-level reversal), but both map to the same PPRO operation.

---

## PPRO Aggregator-Specific Notes

1. **paymentMethod MUST be uppercase** -- PPRO requires "IDEAL", not "ideal" or "iDeal". The MAP_ENUM + UPPER transform enforces this.
2. **Minor-unit conversion** -- all monetary amounts use MULTIPLY_100 on request and DIVIDE_100 on response. No exceptions.
3. **Bearer token auth** -- PPRO uses `Authorization: Bearer {token}` plus `Merchant-Id: {merchant_id}` headers. This differs from Klarna (HTTP Basic) and CashApp (API key).
4. **HATEOAS links** -- PPRO responses include `_links.captures.href`, `_links.refunds.href`, and `_links.voids.href`. These are consumed internally by Commerce Hub for sub-operations and not exposed to merchants.
5. **No line items required** -- Unlike Klarna BNPL, iDEAL bank redirect does not require `orderData.itemDetails[]`. The core fields are amount, currency, consumer identity, country, and return URL.
6. **Single consumer.name field** -- PPRO uses a single `consumer.name` string instead of separate first/last name fields. Commerce Hub must CONCAT `customer.firstName` + " " + `customer.lastName`.
