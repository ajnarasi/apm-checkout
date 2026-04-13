# EPS — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | EPS |
| **Display Name** | EPS |
| **Pattern** | bank-redirect |
| **SDK CDN URL** | N/A — server-side only (via PPRO) |
| **NPM Package** | N/A |
| **SDK Version** | PPRO v1 |
| **Script Loading** | none |
| **Global Variable** | N/A |
| **CSP script-src** | N/A |
| **CSP connect-src** | api.sandbox.eu.ppro.com |
| **Sandbox URL** | https://api.sandbox.eu.ppro.com |
| **Sandbox Type** | Live (PPRO sandbox) |
| **Auth Scheme** | Bearer Token + Merchant-Id header |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| AT | EUR | Primary market |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with EPS" | "Pay with EPS" |
| **Brand Color** | #C8192E | #C8192E |
| **Button Styles** | Standard PPRO button | — |
| **Logo URL** | /logos/eps.svg | — |
| **Bank Selection** | Erste Bank, Raiffeisen, Bank Austria, BAWAG, Volksbank, Hypo | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| PPRO Bearer Token | Credential vault | Rotated every 90 days |
| PPRO Merchant-Id | Configuration | e.g., FIRSTDATATESTCONTRACT (sandbox) |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Bank authentication redirect
Wallet app redirect |
| Widget/Embedded | No | Server-side flow via PPRO |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Trigger Condition | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | PPRO charge created successfully | { chargeId, status, paymentMethod } |
| PAYMENT_AUTHORIZED | Charge status = AUTHORIZED/CAPTURED | { chargeId, status, amount } |
| PAYMENT_ERROR | PPRO charge error or AUTHENTICATION_FAILED | { code, message, retryable } |
| PAYMENT_CANCELLED | Browser back, bank decline, session timeout | { chargeId, status } |
| REDIRECT_REQUIRED | requestUrl available in PPRO response | { url, chargeId } |



### Lifecycle Flow

```
1. loadSDK() → No-op (server-side only via PPRO)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "EPS" button (#C8192E)
4. authorize(paymentData) → POST /api/ppro/charge with paymentMethod=EPS
   → Emits: PAYMENT_METHOD_READY
   → Then: PPRO charge → bank redirect URL → customer authenticates at bank → returns to merchant
5. handleRedirectReturn(params) → GET /api/ppro/charge/{chargeId} → check status
6. getServerHandoff() → { endpoint: '/api/ppro/charge', method: 'POST', body: { paymentMethod: 'EPS', amount, currency: 'EUR' } }
7. teardown() → Clear event bus, config, stop polling
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Authorize (server call) | 30,000ms | No retry |
| Polling | N/A | N/A |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| PPRO Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | Yes | Bad request parameters |
| NOT_FOUND | PROVIDER_ERROR | No | Charge not found |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid credentials |
| AUTHENTICATION_FAILED | AUTH_FAILED | No | Customer failed bank auth |
| AMOUNT_EXCEEDED | VALIDATION_ERROR | No | Amount out of range |
| PROVIDER_ERROR | PROVIDER_ERROR | Yes (with delay) | PPRO internal error |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Auth/Create | /api/ppro/charge | POST | MULTIPLY_100 |
| Status Check | /api/ppro/charge/{chargeId} | GET | — |
| Capture | Auto-capture (autoCapture=true) | — | — |
| Refund | /api/ppro/charge/{chargeId}/refunds | POST | MULTIPLY_100 |

### Key Request Fields (Auth)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount.value | MULTIPLY_100 | Yes |
| amount.currency | amount.currency | PASSTHROUGH | Yes |
| customer.firstName + lastName | consumer.name | CONCAT | Yes |
| customer.email | consumer.email | PASSTHROUGH | Yes |
| customerAddress.country | consumer.country | PASSTHROUGH | Yes |
| paymentMethod.provider | paymentMethod | MAP_ENUM (→ EPS) | Yes |
| checkoutInteractions.returnUrls.successUrl | authenticationSettings[0].settings.returnUrl | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | merchantPaymentChargeReference | PASSTHROUGH | No |

### Key Response Fields (Auth)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| authenticationMethods[0].details.requestUrl | checkoutInteractions.actions.url | PASSTHROUGH |
| authorizations[0].amount | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| merchantPaymentChargeReference | transactionDetails.merchantOrderId | PASSTHROUGH |
