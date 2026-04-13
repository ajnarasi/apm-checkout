# Ucom -> Commerce Hub Adapter Specification: CashApp

> **APM:** CashApp (Cash App Pay)
> **Pattern:** redirect-wallet-v1
> **Commerce Hub Version:** 1.26.0302
> **Ucom Version:** 0.2.3
> **Generated:** 2026-04-12T04:52:00Z
> **Mapping Source:** tech-lead-manual-mapping

---

## 1. Protocol Translation

| Ucom Endpoint | Method | Direction | Commerce Hub Endpoint | Method |
|---|---|---|---|---|
| `/v1/payments/auths` | POST | --> | `/checkouts/v1/orders` | POST |
| `/v1/payments/auths/{fdAuthorizationId}/captures` | POST | --> | `/checkouts/v1/orders` (captureFlag=true) | POST |
| `/v1/payments/auths/{fdAuthorizationId}/refunds` | POST | --> | `/checkouts/v1/orders` (refund operation) | POST |

---

## 2. Field Mapping: Auth Request (Ucom --> Commerce Hub)

| # | Ucom Field | Ucom Type | Direction | CH Field | CH Type | Transform | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `authorization.requestedAmount` | number (double, e.g. 500.00) | --> | `amount.total` | number (decimal) | NONE | Both use decimal format |
| 2 | `authorization.currencyCode` | string (ISO-4217) | --> | `amount.currency` | string | PASSTHROUGH | |
| 3 | `authorization.merchantId` | string | --> | `merchantDetails.merchantId` | string | PASSTHROUGH | |
| 4 | `authorization.storeId` | string | --> | `merchantDetails.storeId` | string | PASSTHROUGH | |
| 5 | `authorization.fundingSource.type` | string | --> | `paymentMethod.provider` | string | MAP_ENUM | Must add "CASHAPP" to FundingSourceType enum |
| 6 | `[NEW] authorization.fundingSource.cashApp.grantId` | string | --> | `paymentMethod.paymentToken.tokenData` | string | PASSTHROUGH | New CashApp object in FundingSource |
| 7 | `[header] Client-Request-Id` | string | --> | `[header] Client-Request-Id` | string | PASSTHROUGH | |
| 8 | `[header] Api-Key` | string | --> | `[header] Api-Key` | string | MAP/BRIDGE | Ucom API key mapped to CH API key (different credential sets) |
| 9 | `[header] Timestamp` | integer | --> | `[header] Timestamp` | integer | PASSTHROUGH | Epoch milliseconds |
| 10 | `[header] Authorization` | string (HMAC) | --> | `[header] Authorization` | string | RECOMPUTE | Must recompute HMAC with CH credentials |

---

## 3. Field Mapping: Auth Response (Commerce Hub --> Ucom)

| # | CH Field | CH Type | Direction | Ucom Field | Ucom Type | Transform | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `transactionProcessingDetails.transactionId` | string | --> | `authorization.fdAuthorizationId` | string | PASSTHROUGH | |
| 2 | `gatewayResponse.transactionState` | string | --> | `authorization.authStatus` | string | MAP_ENUM | AUTHORIZED-->APPROVED, DECLINED-->DECLINED, PAYER_ACTION_REQUIRED-->PENDING |
| 3 | `paymentReceipt.approvedAmount.total` | number | --> | `authorization.approvedAmount` | number | NONE | Both decimal |
| 4 | `order.providerOrderId` | string | --> | `[NEW] authorization.providerOrderId` | string | PASSTHROUGH | GRR_ prefix |
| 5 | `checkoutInteractions.actions.url` | string | --> | `[NEW] authorization.fundingSource.cashApp.redirectUrl` | string | PASSTHROUGH | Customer redirect URL |
| 6 | `checkoutInteractions.actions.code` | string | --> | `[NEW] authorization.fundingSource.cashApp.qrCodeUrl` | string | PASSTHROUGH | QR code URL |
| 7 | `order.orderStatus` | string | --> | `authorization.authStatus` | string | MAP_ENUM | PAYER_ACTION_REQUIRED-->PENDING |
| 8 | `gatewayResponse.transactionProcessingDetails.orderId` | string | --> | `authorization.orderId` | string | PASSTHROUGH | |
| 9 | `paymentReceipt.processorResponseDetails.approvalCode` | string | --> | `authorization.approvalCode` | string | PASSTHROUGH | |
| 10 | `paymentReceipt.processorResponseDetails.referenceNumber` | string | --> | `authorization.hostReferenceNumber` | string | PASSTHROUGH | |
| 11 | `transactionProcessingDetails.transactionTimestamp` | string (ISO-8601) | --> | `authorization.transactionDateTime` | string (ISO-8601) | PASSTHROUGH | |

---

## 4. Capture Request Mapping (Ucom --> Commerce Hub)

| # | Ucom Field | Direction | CH Field | Transform | Notes |
|---|---|---|---|---|---|
| 1 | `capture.requestedAmount` | --> | `amount.total` | NONE | |
| 2 | `capture.currencyCode` | --> | `amount.currency` | PASSTHROUGH | |
| 3 | `{fdAuthorizationId}` (path param) | --> | `referenceTransactionDetails.referenceTransactionId` | PASSTHROUGH | Links capture to original auth |
| 4 | `capture.merchantId` | --> | `merchantDetails.merchantId` | PASSTHROUGH | |

**Capture Response:** `transactionProcessingDetails.transactionId` --> `capture.fdCaptureId`, plus same amount/status mappings as auth response.

---

## 5. Refund Request Mapping (Ucom --> Commerce Hub)

| # | Ucom Field | Direction | CH Field | Transform | Notes |
|---|---|---|---|---|---|
| 1 | `refund.requestedAmount` | --> | `amount.total` | NONE | |
| 2 | `refund.currencyCode` | --> | `amount.currency` | PASSTHROUGH | |
| 3 | `{fdAuthorizationId}` (path param) | --> | `referenceTransactionDetails.referenceTransactionId` | PASSTHROUGH | Links refund to original auth |
| 4 | `refund.merchantId` | --> | `merchantDetails.merchantId` | PASSTHROUGH | |

**Refund Response:** `transactionProcessingDetails.transactionId` --> `refund.fdRefundId`, plus same amount/status mappings.

---

## 6. Auth Bridging

Ucom uses `Api-Key` + `Timestamp` + HMAC `Authorization` header. Commerce Hub uses `Api-Key` + `Timestamp` + `Auth-Token-Type` + HMAC `Authorization`.

**Adapter responsibilities:**

1. Map Ucom `Api-Key` to CH `Api-Key` (may be different credential sets; lookup via credential vault)
2. Add `Auth-Token-Type: HMAC` header (not present in Ucom requests)
3. Recompute HMAC signature using CH credentials and CH request body
4. Preserve `Client-Request-Id` for end-to-end traceability
5. Preserve `Timestamp` (epoch milliseconds)

**HMAC computation for CH:**
```
Message = Api-Key + Client-Request-Id + Timestamp + RequestBody
Signature = Base64(HMAC-SHA256(Message, ApiSecret))
Authorization = Signature
```

---

## 7. Schema Changes Required on Ucom

### 7a. Enum Addition
Add `"CASHAPP"` to the `FundingSourceType` enum (alongside existing values: CREDIT, DEBIT, PREPAID, PAYPAL, APPLEPAY, GOOGLEPAY, etc.).

### 7b. New CashApp Object in FundingSource

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

Add to FundingSource as optional field:
```yaml
FundingSource:
  properties:
    # ... existing fields ...
    cashApp:
      $ref: '#/components/schemas/CashApp'
```

---

## 8. Error Code Mapping

| CH Error Code | CH HTTP Status | Direction | Ucom Error Code | Ucom HTTP Status |
|---|---|---|---|---|
| `INVALID_REQUEST` | 400 | --> | `BadRequest` | 400 |
| `AUTHENTICATION_ERROR` | 401 | --> | `Unauthorized` | 401 |
| `RESOURCE_NOT_FOUND` | 404 | --> | `NotFound` | 404 |
| `GATEWAY_ERROR` | 500 | --> | `ServerError` | 500 |
| `PROVIDER_TIMEOUT` | 504 | --> | `ServerError` | 500 |
| `RATE_LIMIT_EXCEEDED` | 429 | --> | `TooManyRequests` | 429 |
| `VALIDATION_ERROR` | 422 | --> | `UnprocessableEntity` | 422 |

---

## 9. Redirect Wallet Lifecycle (CashApp-Specific)

```
1. Ucom client --> POST /v1/payments/auths (with cashApp.grantId)
2. Adapter translates --> POST /checkouts/v1/orders
3. CH returns PAYER_ACTION_REQUIRED + redirect URL + QR code URL
4. Adapter translates response --> authStatus=PENDING + cashApp.redirectUrl + cashApp.qrCodeUrl
5. Ucom client redirects customer to CashApp (or displays QR code)
6. Customer approves in CashApp
7. CashApp redirects customer back to merchant returnUrl
8. Ucom client --> GET /v1/payments/auths/{fdAuthorizationId} (status check)
9. Adapter translates --> GET order status from CH
10. CH returns AUTHORIZED --> Adapter returns authStatus=APPROVED
11. Ucom client --> POST capture (optional, if auth-only flow)
```

---

## 10. Observability Requirements

- Log all field transforms with correlation ID (`Client-Request-Id`)
- Emit metrics: `ucom.cashapp.auth.latency`, `ucom.cashapp.auth.success_rate`
- Alert on HMAC recomputation failures (indicates credential misconfiguration)
- Track redirect completion rate: `ucom.cashapp.redirect.completion_rate`
