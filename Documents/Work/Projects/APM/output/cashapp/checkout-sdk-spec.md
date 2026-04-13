# Cash App Pay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | CASHAPP |
| **Display Name** | Cash App Pay |
| **Pattern** | redirect-wallet |
| **SDK CDN URL** | https://sand.kit.cash.app/web/cashapp-pay.js |
| **NPM Package** | N/A |
| **SDK Version** | v1 |
| **Script Loading** | async script tag |
| **Global Variable** | CashAppPay (via SDK import) |
| **CSP script-src** | sand.kit.cash.app, kit.cash.app |
| **CSP connect-src** | sandbox.api.cash.app, api.cash.app |
| **Sandbox URL** | https://sandbox.api.cash.app |
| **Sandbox Type** | Live (Cash App Sandbox) |
| **Auth Scheme** | HMAC-SHA256 (signature header) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market (US only) |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | $49.99 → 4999 |
| **Type** | Integer (minor units) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **shape** | round, semiround | semiround |
| **size** | medium, small | medium |
| **theme** | dark, light | dark |
| **Brand Color** | #00D64B (Cash App Green) | #00D64B |
| **Logo URL** | /logos/cashapp.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Client ID | Credential vault | Cash App developer portal |
| API Secret | Credential vault | For HMAC-SHA256 signing |
| Brand ID | Configuration | Identifies merchant brand |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Mobile deep-link to Cash App |
| Widget/Embedded | No | — |
| QR Code | Yes | Desktop flow shows QR for mobile scan |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

### Test Credentials (Magic Amounts)

| Amount (cents) | Scenario | Expected Result |
|---|---|---|
| 7771 | Insufficient funds | Payment declined — insufficient balance |
| 7772 | Decline | Payment declined — generic |

### Test Credentials (Magic Grants)

| Grant ID | State | Notes |
|---|---|---|
| GRG_sandbox:active | Active | Grant is active and usable |
| GRG_sandbox:consumed | Consumed | Grant already used |
| GRG_sandbox:expired | Expired | Grant has expired |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Cash App Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { requestId, brandId } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { grantId, customerId, cashTag } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { reason } |
| REDIRECT_REQUIRED | REDIRECT | { url, deepLink } |
| QR_CODE_GENERATED | QR | { qrUrl, expiresAt } |

### Lifecycle Flow

```
1. loadSDK() → Inject <script src="sand.kit.cash.app/web/cashapp-pay.js">
2. init(config, eventBus) → POST /api/cashapp/request → receive request_id
   → CashAppPay.render({ clientId, requestId })
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Cash App Pay button rendered (shape, size, theme config)
   → Desktop: QR code displayed → Emits: QR_CODE_GENERATED
   → Mobile: Deep-link button shown
4. authorize(paymentData) → User taps button → redirect to Cash App
   → Desktop: User scans QR → approves in Cash App
   → Mobile: User approves in Cash App → redirect back
   → Emits: PAYMENT_AUTHORIZED (with grant_id, customer_id)
5. handleRedirectReturn(params) → Verify grant status via webhook or poll
6. getServerHandoff() → { endpoint: '/api/cashapp/request', method: 'POST', body: { grantId, amount, currency } }
7. teardown() → Remove button/QR, clear event bus, cancel polling
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| SDK init (request create) | 15,000ms | No retry |
| Button render | 5,000ms | No retry |
| Authorize (redirect/QR) | 300,000ms (5 min) | No retry (user-driven) |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Cash App Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | Yes | Bad request parameters |
| INSUFFICIENT_FUNDS | AUTH_FAILED | No | Customer has insufficient balance |
| GRANT_EXPIRED | AUTH_FAILED | Yes | Re-create payment request |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid HMAC signature |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | Cash App outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Payment Request | /api/cashapp/request | POST | MULTIPLY_100 |

### Key Request Fields (Payment Request)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount | MULTIPLY_100 | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | reference_id | PASSTHROUGH | Yes |
| grantId | grant_id | PASSTHROUGH | Yes |
| customer.cashTag | cashtag | PASSTHROUGH | No |

### Key Response Fields (Payment Request)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| grant_id | paymentReceipt.grantId | PASSTHROUGH |
| amount | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| customer_id | paymentReceipt.customerId | PASSTHROUGH |
