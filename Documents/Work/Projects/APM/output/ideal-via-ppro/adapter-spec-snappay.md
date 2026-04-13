# SnapPay - Commerce Hub Adapter Specification for iDEAL via PPRO

> Generated: 2026-04-12T07:02:00Z | Pattern: bank-redirect-v1 | Commerce Hub: 1.26.0302 | SnapPay: 3.0.9 | Aggregator: PPRO | Confidence: generated

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| PPRO Provider API | v1 |
| Aggregator | PPRO |
| Target APM | iDEAL |
| SnapPay | 3.0.9 |
| Pattern Template | bank-redirect-v1 |
| Golden Mapping Source | NONE -- generated from sandbox discovery |
| Confidence | generated |
| Safety Checks | PASSED |

---

## 2. Key Insight: Simpler Than BNPL

iDEAL via PPRO is a significantly simpler integration than Klarna BNPL for SnapPay. No line-item data (`level3[]`) is required. The core fields are amount, currency, consumer identity, country, and return URL. SnapPay's existing redirect-capable `GetRequestID` + `charge` flow maps cleanly to the PPRO bank redirect pattern.

---

## 3. Protocol Translation

| SnapPay Operation | CH Endpoint | PPRO Endpoint | Notes |
|---|---|---|---|
| GetRequestID (init) | POST /checkouts/v1/orders | POST /v1/payment-charges | Returns chargeId + bankRedirectUrl |
| charge (after bank auth) | POST /checkouts/v1/orders (capture) | POST /v1/payment-charges/{id}/captures | Capture after confirmed auth |
| refund | POST /checkouts/v1/orders (refund) | POST /v1/payment-charges/{id}/refunds | Full or partial refund |
| void | POST /checkouts/v1/orders (void) | POST /v1/payment-charges/{id}/voids | Before capture only |

---

## 4. SnapPay Bank Redirect Flow

```
Step 1 -- GetRequestID (Create Payment Charge):
  SnapPay GetRequestID (paymentmode=IDEAL)
    -> CH POST /checkouts/v1/orders
      -> PPRO POST /v1/payment-charges (paymentMethod: "IDEAL")
      <- Returns: chargeId, status=AUTHENTICATION_PENDING, redirectUrl
    <- CH returns: transactionId, transactionState=PAYER_ACTION_REQUIRED, actions.url
  <- SnapPay returns: requestid, idealRedirectUrl, status=PENDING

  [Customer redirected to iDEAL bank page]
  [Customer selects bank, authenticates, confirms payment]
  [Customer redirected back to merchant redirecturl]

Step 2 -- Status Confirmation:
  Webhook or poll confirms AUTHORIZED status
  SnapPay transactionstatus = APPROVED

Step 3 -- charge (Capture):
  SnapPay charge (referencing requestid)
    -> CH POST /checkouts/v1/orders (capture)
      -> PPRO POST /v1/payment-charges/{chargeId}/captures
      <- Returns: capture status
    <- CH returns: transactionState=CAPTURED
  <- SnapPay returns: transactionid, status=CAPTURED
```

---

## 5. Domain Translation: Full Field Mapping

### 5.1 Auth Request (SnapPay to CH to PPRO)

| SnapPay Field | Type | CH Field | Type | PPRO Field | Type | Transform Chain | Tier |
|---|---|---|---|---|---|---|---|
| transactionamount | decimal | amount.total | decimal | amount.value | integer (cents) | NONE then MULTIPLY_100 | 1 |
| currencycode | string | amount.currency | string | amount.currency | string | PASSTHROUGH chain | 1 |
| customer.country | string | customerAddress.country | string | consumer.country | string | PASSTHROUGH chain | 1 |
| orderid | string | transactionDetails.merchantOrderId | string | merchantPaymentChargeReference | string | PASSTHROUGH chain | 1 |
| customer.email | string | customer.email | string | consumer.email | string | PASSTHROUGH chain | 1 |
| customer.customername | string | customer.firstName + customer.lastName | string | consumer.name | string | SPLIT_ON_SPACE then CONCAT | 1 |
| redirecturl | string | checkoutInteractions.returnUrls.successUrl | string | authenticationSettings[0].settings.returnUrl | string | PASSTHROUGH chain | 1 |
| callbackurl | string | checkoutInteractions.callbackUrl | string | N/A | N/A | STORED_FOR_WEBHOOK | 2 |
| autocapture | boolean | transactionDetails.captureFlag | boolean | autoCapture | boolean | PASSTHROUGH chain | 2 |

### 5.2 Customer Name Split-Then-Concat Transform

SnapPay sends `customer.customername` as a single string. Commerce Hub requires separate first/last name fields. PPRO requires a single `consumer.name` field.

Transform chain:
1. **SnapPay to CH**: `SPLIT_ON_SPACE` -- split on first space. Before space = firstName, after space = lastName. If no space, entire string = firstName, lastName = empty.
2. **CH to PPRO**: `CONCAT` -- rejoin as `consumer.name = firstName + " " + lastName`.

Net effect for iDEAL: the name passes through unchanged. But the split is required at the SnapPay-to-CH boundary for CH schema compliance.

### 5.3 Auth Response (PPRO to CH to SnapPay)

| PPRO Field | CH Field | SnapPay Field | Transform Chain | Tier |
|---|---|---|---|---|
| id (charge_*) | transactionProcessingDetails.transactionId | transactionid | PASSTHROUGH chain | 1 |
| status | gatewayResponse.transactionState | transactionstatus | MAP_ENUM chain | 1 |
| authenticationMethods[0].details.requestUrl | checkoutInteractions.actions.url | idealRedirectUrl | PASSTHROUGH chain | 1 |
| authorizations[0].id | paymentReceipt.processorResponseDetails.referenceNumber | authorizationref | PASSTHROUGH chain | 1 |
| authorizations[0].amount | paymentReceipt.approvedAmount.total | approvedamount | DIVIDE_100 chain | 1 |
| currency | paymentReceipt.approvedAmount.currency | currencycode | PASSTHROUGH chain | 1 |
| merchantPaymentChargeReference | transactionDetails.merchantOrderId | orderid | PASSTHROUGH chain | 1 |
| instrumentId | paymentMethod.paymentToken.tokenData | instrumentid | PASSTHROUGH chain | 2 |

### 5.4 Transaction State Mapping Chain

| PPRO status | CH transactionState | SnapPay transactionstatus |
|---|---|---|
| AUTHENTICATION_PENDING | PAYER_ACTION_REQUIRED | PENDING |
| AUTHORIZED | AUTHORIZED | APPROVED |
| CAPTURED | CAPTURED | CAPTURED |
| REFUNDED | REFUNDED | REFUNDED |
| VOIDED | VOIDED | VOIDED |
| AUTHENTICATION_FAILED | DECLINED | DECLINED |

---

## 6. Capture Mapping (SnapPay to CH to PPRO)

| SnapPay Field | CH Field | PPRO Field | Transform | Tier |
|---|---|---|---|---|
| transactionamount | amount.total | amount.value | NONE then MULTIPLY_100 | 1 |
| transactionid | referenceTransactionDetails.referenceTransactionId | {chargeId} in URL path | PASSTHROUGH then PATH_PARAM | 1 |

### Capture Response

| PPRO Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| captures[0].id | paymentReceipt.processorResponseDetails.referenceNumber | captureid | PASSTHROUGH | 1 |
| captures[0].amount | paymentReceipt.approvedAmount.total | capturedamount | DIVIDE_100 | 1 |
| status | gatewayResponse.transactionState | transactionstatus | MAP_ENUM | 1 |

---

## 7. Refund Mapping (SnapPay to CH to PPRO)

| SnapPay Field | CH Field | PPRO Field | Transform | Tier |
|---|---|---|---|---|
| refundamount | amount.total | amount.value | NONE then MULTIPLY_100 | 1 |
| transactionid | referenceTransactionDetails.referenceTransactionId | {chargeId} in URL path | PASSTHROUGH then PATH_PARAM | 1 |
| refundreason | refundDescription | N/A | STORED_IN_CH | 2 |

### Refund Response

| PPRO Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| refunds[0].id | paymentReceipt.processorResponseDetails.referenceNumber | refundid | PASSTHROUGH | 1 |
| refunds[0].amount | paymentReceipt.refundedAmount.total | refundedamount | DIVIDE_100 | 1 |
| status | gatewayResponse.transactionState | transactionstatus | MAP_ENUM | 1 |

---

## 8. Void Mapping

Void requires only the charge reference. No request body fields beyond the charge ID in the URL path.

| SnapPay Field | CH Field | PPRO Field | Transform | Tier |
|---|---|---|---|---|
| transactionid (path) | referenceTransactionDetails.referenceTransactionId | {chargeId} in URL path | PASSTHROUGH then PATH_PARAM | 1 |

Response sets `transactionstatus = VOIDED`.

---

## 9. Unmappable B2B Fields

The following SnapPay fields are B2B/ERP-specific and have no equivalent in CH or PPRO. They are stored in the adapter configuration layer and not passed downstream:

| SnapPay Field | Disposition |
|---|---|
| companycode | Stored in adapter config |
| branchplant | Stored in adapter config |
| supplier.supplierid | Stored in adapter config |
| supplier.suppliername | Stored in adapter config |
| clxstream[] | Stored in adapter config |
| ordertype | Stored in adapter config |
| jdeinstance | Stored in adapter config |
| aboreason | Stored in adapter config |
| level3[] | Not needed for bank redirect (no line items required) |

---

## 10. Schema Changes Required on SnapPay

### 10.1 New Payment Mode

Add "IDEAL" as a valid `paymentmode` value alongside existing CC, ACH, CASHAPP, KLARNA.

### 10.2 New Response Fields

Add to the SnapPay GetRequestID and charge response schema:

```yaml
idealRedirectUrl:
  type: string
  description: URL to redirect customer to iDEAL bank authentication page
  readOnly: true
instrumentid:
  type: string
  description: PPRO payment instrument identifier
  readOnly: true
authorizationref:
  type: string
  description: PPRO authorization reference ID
  readOnly: true
```

### 10.3 GetRequestID Enhancement

The GetRequestID response needs the redirect URL for the bank authentication flow:

```yaml
idealRedirectUrl:
  type: string
  description: Bank redirect URL from PPRO (Phase 1)
  readOnly: true
```

### 10.4 No New Request Fields Required

Unlike Klarna BNPL which required `klarnaAuthToken`, the iDEAL bank redirect pattern does not require any new request fields beyond the existing SnapPay schema. The bank authentication happens via browser redirect, and confirmation comes via webhook/polling. No token exchange is needed.

---

## 11. Error Code Mapping

| PPRO Error | CH Error Code | SnapPay Error Code | HTTP Status | Description |
|---|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | 4001 | 400 | Invalid field value or missing required field |
| NOT_FOUND | RESOURCE_NOT_FOUND | 4041 | 404 | Charge not found |
| UNAUTHORIZED | AUTHORIZATION_FAILED | 4031 | 401 | Invalid credentials |
| FORBIDDEN | AUTHORIZATION_FAILED | 4031 | 403 | Insufficient permissions |
| INVALID_STATE | INVALID_OPERATION | 4091 | 409 | Invalid state transition |
| AMOUNT_EXCEEDED | AMOUNT_MISMATCH | 4002 | 400 | Amount exceeds authorized amount |
| CAPTURE_FAILED | CAPTURE_FAILED | 4093 | 409 | Not in capturable state |
| REFUND_FAILED | REFUND_FAILED | 4094 | 409 | Not in refundable state |
| VOID_FAILED | CANCEL_FAILED | 4095 | 409 | Not in voidable state |
| PROVIDER_ERROR | PROVIDER_ERROR | 5021 | 502 | PPRO or iDEAL backend error |

---

## 12. Regional Configuration

| Region | SnapPay Currency | PPRO consumer.country | PPRO paymentMethod | PPRO API Base |
|---|---|---|---|---|
| NL | EUR | NL | IDEAL | https://api.sandbox.eu.ppro.com (sandbox) |

iDEAL is a single-region APM (Netherlands only, EUR only). No regional routing logic is needed.

---

## 13. Auth Bridging

SnapPay authentication uses API key-based auth. The adapter layer:
1. Validates SnapPay API key at the gateway
2. Maps to CH HMAC credentials for the CH boundary
3. CH maps to Bearer token + Merchant-Id header for the PPRO boundary
4. Each boundary handles its own auth -- credentials are never passed through

---

## 14. Supported Capabilities Matrix

| Capability | SnapPay Support | CH Support | PPRO Support | iDEAL Support | Notes |
|---|---|---|---|---|---|
| GetRequestID (init) | Y | Y | Y | Y | Returns bank redirect URL |
| Capture (charge) | Y | Y | Y | Y | After bank auth confirmed |
| Partial Refund | Y | Y | Y | Y | |
| Full Refund | Y | Y | Y | Y | |
| Void | Y | Y | Y | Y | Before capture only |
| Discard | N | N | Y | N/A | PPRO-specific, not mapped |
