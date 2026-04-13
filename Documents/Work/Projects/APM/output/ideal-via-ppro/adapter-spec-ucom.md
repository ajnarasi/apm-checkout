# Ucom - Commerce Hub Adapter Specification for iDEAL via PPRO

> Generated: 2026-04-12T07:02:00Z | Pattern: bank-redirect-v1 | Commerce Hub: 1.26.0302 | Ucom: 0.2.3 | Aggregator: PPRO | Confidence: generated

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| PPRO Provider API | v1 |
| Aggregator | PPRO |
| Target APM | iDEAL |
| Ucom | 0.2.3 |
| Pattern Template | bank-redirect-v1 |
| Golden Mapping Source | NONE -- generated from sandbox discovery |
| Confidence | generated |
| Safety Checks | PASSED |

### Adapter Architecture

```mermaid
graph LR
    A["Ucom Merchant"] --> B["Adapter"]
    B --> C["Commerce Hub"]
    C --> D["PPRO"]
    D --> E["iDEAL"]
    style A fill:#1a1a2a,stroke:#ff9800,color:#e0e0e0
    style B fill:#1a1a2a,stroke:#ff9800,color:#e0e0e0
    style C fill:#1a1a2a,stroke:#6C63FF,color:#e0e0e0
    style D fill:#1a1a2a,stroke:#2196f3,color:#e0e0e0
    style E fill:#1a1a2a,stroke:#4caf50,color:#e0e0e0
```

---

## 2. Protocol Translation

| Ucom Endpoint | CH Endpoint | PPRO Endpoint | Notes |
|---|---|---|---|
| POST /v1/payments/auths | POST /checkouts/v1/orders | POST /v1/payment-charges | Returns redirect URL for bank auth |
| POST /v1/payments/auths/{id}/captures | POST /checkouts/v1/orders (capture) | POST /v1/payment-charges/{id}/captures | Full or partial capture |
| POST /v1/payments/auths/{id}/refunds | POST /checkouts/v1/orders (refund) | POST /v1/payment-charges/{id}/refunds | Full or partial refund |
| POST /v1/payments/auths/{id}/void | POST /checkouts/v1/orders (void) | POST /v1/payment-charges/{id}/voids | Void before capture |

---

## 3. Auth Flow: Bank Redirect Pattern

iDEAL via PPRO follows a redirect-based authorization flow:

```
Phase 1 -- Create Payment Charge:
  Ucom POST /v1/payments/auths
    -> CH POST /checkouts/v1/orders
      -> PPRO POST /v1/payment-charges (paymentMethod: "IDEAL")
      <- Returns: chargeId, status=AUTHENTICATION_PENDING, redirectUrl
    <- CH returns: transactionId, transactionState=PAYER_ACTION_REQUIRED, actions.url
  <- Ucom returns: fdAuthorizationId, authStatus=PENDING, ideal.bankRedirectUrl

  [Customer redirected to iDEAL bank page]
  [Customer selects bank, authenticates, confirms payment]
  [Customer redirected back to merchant returnUrl]

Phase 2 -- Confirm Authorization (webhook/poll):
  PPRO sends webhook or Ucom polls status
    -> PPRO status = AUTHORIZED
    -> CH transactionState = AUTHORIZED
  <- Ucom authStatus = APPROVED
```

---

## 4. Field Mapping: Auth Request (Ucom to CH)

### 4.1 Core Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.requestedAmount | number (decimal) | amount.total | number (decimal) | NONE | Y | Both use decimal |
| authorization.currencyCode | string | amount.currency | string | PASSTHROUGH | Y | "EUR" for iDEAL |
| authorization.merchantId | string | merchantDetails.merchantId | string | PASSTHROUGH | Y | |
| authorization.storeId | string | merchantDetails.storeId | string | PASSTHROUGH | N | Not passed to PPRO |
| authorization.fundingSource.type | string | paymentMethod.provider | string | MAP_ENUM | Y | Map to "IDEAL" |
| authorization.orderId | string | transactionDetails.merchantOrderId | string | PASSTHROUGH | Y | Merchant order reference |
| authorization.captureFlag | boolean | transactionDetails.captureFlag | boolean | PASSTHROUGH | N | Maps to PPRO autoCapture |

### 4.2 Customer Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.customer.email | string | customer.email | string | PASSTHROUGH | Y | Required by PPRO |
| authorization.customer.firstName | string | customer.firstName | string | PASSTHROUGH | Y | CONCAT at CH-to-PPRO boundary |
| authorization.customer.lastName | string | customer.lastName | string | PASSTHROUGH | Y | CONCAT at CH-to-PPRO boundary |
| authorization.customer.country | string | customerAddress.country | string | PASSTHROUGH | Y | "NL" for iDEAL |

### 4.3 Redirect Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.redirectUrl | string | checkoutInteractions.returnUrls.successUrl | string | PASSTHROUGH | Y | Post-auth redirect URL |

### 4.4 Headers

| Ucom Header | CH Header | Transform | Notes |
|---|---|---|---|
| Client-Request-Id | Client-Request-Id | PASSTHROUGH | Idempotency key |
| Authorization (HMAC) | Authorization (HMAC) | RECOMPUTE | Ucom HMAC to CH HMAC |
| Content-Type | Content-Type | PASSTHROUGH | application/json |
| [NEW] Auth-Token-Type | Auth-Token-Type | SET_VALUE | Set to "HMAC" |

---

## 5. Auth Response Mapping (CH to Ucom)

### 5.1 Core Response Fields

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| transactionProcessingDetails.transactionId | authorization.fdAuthorizationId | PASSTHROUGH | PPRO charge_id (e.g., charge_oc43q4PDbViOlkzoweDXQ) |
| transactionProcessingDetails.orderId | authorization.orderId | PASSTHROUGH | Echoed merchant reference |
| gatewayResponse.transactionState | authorization.authStatus | MAP_ENUM | See enum table below |
| gatewayResponse.gatewayResponseCode | authorization.responseCode | PASSTHROUGH | |
| gatewayResponse.gatewayResponseMessage | authorization.responseMessage | PASSTHROUGH | |
| paymentReceipt.approvedAmount.total | authorization.approvedAmount | NONE | |
| paymentReceipt.approvedAmount.currency | authorization.currencyCode | PASSTHROUGH | |

### 5.2 iDEAL-Specific Response Fields (New)

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| checkoutInteractions.actions.url | authorization.fundingSource.ideal.bankRedirectUrl | PASSTHROUGH | URL to redirect customer to iDEAL bank page |
| checkoutInteractions.actions.type | authorization.fundingSource.ideal.actionType | PASSTHROUGH | "WEB_REDIRECTION" |
| paymentMethod.paymentToken.tokenData | authorization.fundingSource.ideal.instrumentId | PASSTHROUGH | PPRO instrument ID |
| paymentReceipt.processorResponseDetails.referenceNumber | authorization.fundingSource.ideal.authorizationId | PASSTHROUGH | PPRO authorization ID |

### 5.3 Transaction State Enum Mapping

| CH transactionState | Ucom authStatus | PPRO status |
|---|---|---|
| PAYER_ACTION_REQUIRED | PENDING | AUTHENTICATION_PENDING |
| AUTHORIZED | APPROVED | AUTHORIZED |
| CAPTURED | CAPTURED | CAPTURED |
| DECLINED | DECLINED | AUTHENTICATION_FAILED |
| VOIDED | CANCELLED | VOIDED |

---

## 6. Capture Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| capture.amount | amount.total | NONE | Full or partial capture amount |
| capture.currencyCode | amount.currency | PASSTHROUGH | "EUR" |
| capture.referenceTransactionId | referenceTransactionDetails.referenceTransactionId | PASSTHROUGH | PPRO charge ID from auth |

### Capture Response

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| paymentReceipt.processorResponseDetails.referenceNumber | capture.captureId | PASSTHROUGH | PPRO capture ID |
| paymentReceipt.approvedAmount.total | capture.capturedAmount | NONE | |
| gatewayResponse.transactionState | capture.status | MAP_ENUM | CAPTURED -> CAPTURED |

---

## 7. Refund Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| refund.amount | amount.total | NONE | Full or partial refund amount |
| refund.currencyCode | amount.currency | PASSTHROUGH | "EUR" |
| refund.referenceTransactionId | referenceTransactionDetails.referenceTransactionId | PASSTHROUGH | PPRO charge ID |
| refund.reason | refundDescription | PASSTHROUGH | Refund reason |

### Refund Response

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| paymentReceipt.processorResponseDetails.referenceNumber | refund.refundId | PASSTHROUGH | PPRO refund ID |
| paymentReceipt.refundedAmount.total | refund.refundedAmount | NONE | |
| gatewayResponse.transactionState | refund.status | MAP_ENUM | REFUNDED -> REFUNDED |

---

## 8. Void Mapping

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| (path param) authorizationId | referenceTransactionDetails.referenceTransactionId | PASSTHROUGH | PPRO charge ID |

Void response sets `authorization.authStatus = CANCELLED`.

---

## 9. Schema Changes Required on Ucom

### 9.1 FundingSourceType Enum Addition

Add "IDEAL" to the existing FundingSourceType enum alongside CREDIT, DEBIT, PREPAID, CASHAPP, KLARNA, etc.

### 9.2 New iDEAL Object on FundingSource

```yaml
Ideal:
  type: object
  properties:
    bankRedirectUrl:
      type: string
      description: URL to redirect customer to iDEAL bank authentication page (response only)
      readOnly: true
    actionType:
      type: string
      description: Type of customer action required
      enum: [WEB_REDIRECTION]
      readOnly: true
    instrumentId:
      type: string
      description: PPRO payment instrument identifier (response only)
      readOnly: true
    authorizationId:
      type: string
      description: PPRO authorization reference ID (response only)
      readOnly: true
    chargeId:
      type: string
      description: PPRO charge ID for subsequent operations (response only)
      readOnly: true
```

### 9.3 Redirect Handling Requirement

**CRITICAL**: The bank redirect pattern requires the merchant frontend to redirect the customer to `bankRedirectUrl` after receiving the auth response. This is fundamentally different from card-based flows. The Ucom adapter must:

1. Surface `bankRedirectUrl` in the auth response so the merchant can redirect the customer
2. Accept and pass through `redirectUrl` (the merchant's return URL) in the auth request
3. Support async status confirmation via webhook or polling after the customer returns from the bank

### 9.4 No Line Item Requirement

Unlike Klarna BNPL, iDEAL via PPRO does NOT require line-item data (`purchaseInfo[]`). The auth request needs only amount, currency, consumer identity, country, and return URL. This simplifies the Ucom integration compared to BNPL.

---

## 10. Auth Bridging

Same pattern as CashApp and Klarna adapters:
- Ucom HMAC signature is validated at the Ucom gateway
- CH HMAC is recomputed using CH credentials before forwarding
- Add `Auth-Token-Type: HMAC` header
- PPRO auth uses Bearer token + Merchant-Id header -- this is handled at the CH-to-PPRO boundary, not exposed to Ucom

---

## 11. Error Code Mapping

| PPRO Error | CH Error Code | Ucom Error Code | HTTP Status | Description |
|---|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | 40001 | 400 | Invalid field value or missing required field |
| NOT_FOUND | RESOURCE_NOT_FOUND | 40401 | 404 | Charge not found |
| UNAUTHORIZED | AUTHORIZATION_FAILED | 40301 | 401 | Invalid Bearer token or Merchant-Id |
| FORBIDDEN | AUTHORIZATION_FAILED | 40301 | 403 | Insufficient permissions |
| INVALID_STATE | INVALID_OPERATION | 40901 | 409 | Invalid state transition (e.g., capture before auth) |
| AMOUNT_EXCEEDED | AMOUNT_MISMATCH | 40002 | 400 | Capture/refund exceeds authorized amount |
| CAPTURE_FAILED | CAPTURE_FAILED | 40903 | 409 | Charge not in capturable state |
| REFUND_FAILED | REFUND_FAILED | 40904 | 409 | Charge not in refundable state |
| VOID_FAILED | CANCEL_FAILED | 40905 | 409 | Charge not in voidable state |
| PROVIDER_ERROR | PROVIDER_ERROR | 50201 | 502 | PPRO or iDEAL backend error |

---

## 12. iDEAL-Specific Concerns

### 12.1 Bank Redirect Timeout
iDEAL bank authentication sessions typically expire within 15-30 minutes. If the customer does not complete authentication within this window, the charge transitions to AUTHENTICATION_FAILED. The Ucom adapter should handle this gracefully by checking charge status before attempting capture.

### 12.2 EUR Only
iDEAL supports only EUR currency. The Ucom adapter should validate `currencyCode = "EUR"` server-side and reject non-EUR requests with HTTP 400 and message: "iDEAL payments support EUR currency only."

### 12.3 NL Only
iDEAL is a Netherlands-specific payment method. The Ucom adapter should validate `customer.country = "NL"` and reject non-NL requests with HTTP 400 and message: "iDEAL payments are available only for Netherlands (NL) customers."

### 12.4 No Partial Capture
Bank redirect payments via PPRO typically support full capture only. Partial capture behavior should be validated during integration testing.

---

## 13. Supported Capabilities Matrix

| Capability | Ucom Support | CH Support | PPRO Support | iDEAL Support | Notes |
|---|---|---|---|---|---|
| Auth (Create Charge) | Y | Y | Y | Y | Returns bank redirect URL |
| Full Capture | Y | Y | Y | Y | |
| Partial Capture | NEEDS VALIDATION | Y | Y | TBD | Bank redirect may not support partial |
| Full Refund | Y | Y | Y | Y | |
| Partial Refund | Y | Y | Y | Y | |
| Void | Y | Y | Y | Y | Before capture only |
| Discard | N | N | Y | N/A | PPRO-specific: discard pending auth |
