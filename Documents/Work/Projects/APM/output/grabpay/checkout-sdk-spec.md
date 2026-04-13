# GrabPay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | GRABPAY |
| **Display Name** | GrabPay |
| **Pattern** | redirect-wallet |
| **SDK CDN URL** | N/A — server-side redirect flow |
| **NPM Package** | N/A |
| **SDK Version** | N/A |
| **Script Loading** | none |
| **Global Variable** | N/A |
| **CSP script-src** | N/A |
| **CSP connect-src** | Internal API only |
| **Sandbox URL** | N/A (mock environment) |
| **Sandbox Type** | Mock |
| **Auth Scheme** | HMAC-SHA256 (signed request body) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| SG | SGD | Primary market |
| MY | MYR | Malaysia |
| PH | PHP | Philippines |
| VN | VND | Vietnam |
| TH | THB | Thailand |
| ID | IDR | Indonesia |
| MM | MMK | Myanmar |
| KH | KHR | Cambodia |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | 49.99 → 4999 |
| **Type** | Integer (minor units) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with GrabPay" | "Pay with GrabPay" |
| **Brand Color** | #00B14F (Grab Green) | #00B14F |
| **Logo URL** | /logos/grabpay.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Partner ID | Credential vault | Grab partner portal |
| Partner Secret | Credential vault | For HMAC-SHA256 signing |
| Merchant ID | Configuration | Per-country merchant identifier |
| Terminal ID | Configuration | Terminal/POS identifier |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Redirect to GrabPay app/web |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | GrabPay Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { partnerTxID, chargeId } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { partnerTxID, txID, status, amount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { partnerTxID, reason } |
| REDIRECT_REQUIRED | REDIRECT | { redirectUrl } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side redirect flow)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "GrabPay" button
4. authorize(paymentData) → POST /api/grabpay/charge → receive redirect URL
   → Emits: PAYMENT_METHOD_READY
   → Redirect customer to GrabPay authorization page
   → Emits: REDIRECT_REQUIRED
5. handleRedirectReturn(params) → GET /api/grabpay/status/:id → check charge status
   → Emits: PAYMENT_AUTHORIZED or PAYMENT_CANCELLED
6. getServerHandoff() → { endpoint: '/api/grabpay/charge', method: 'POST', body: { amount, currency, region } }
7. teardown() → Clear event bus, config
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Charge create (server call) | 30,000ms | No retry |
| Redirect return | 600,000ms (10 min) | No retry (user-driven) |
| Status check (server handoff) | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| GrabPay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_PARAMS | VALIDATION_ERROR | Yes | Bad request parameters |
| INSUFFICIENT_BALANCE | AUTH_FAILED | No | User insufficient funds |
| TRANSACTION_NOT_FOUND | VALIDATION_ERROR | No | Partner TX ID not found |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid HMAC signature |
| INTERNAL_SERVER_ERROR | PROVIDER_ERROR | Yes (with delay) | GrabPay internal error |
| DUPLICATE_REQUEST | VALIDATION_ERROR | No | Idempotent request collision |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Charge Create | /api/grabpay/charge | POST | MULTIPLY_100 |
| Status Check | /api/grabpay/status/:id | GET | — |
| Refund | /api/grabpay/refund | POST | MULTIPLY_100 |

### Key Request Fields (Charge Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount | MULTIPLY_100 | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | partnerTxID | PASSTHROUGH | Yes |
| transactionDetails.description | description | PASSTHROUGH | No |
| customerAddress.country | countryCode | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.successUrl | returnUrl | PASSTHROUGH | Yes |

### Key Response Fields (Charge Create)

| APM Field | CH Field | Transform |
|---|---|---|
| partnerTxID | transactionProcessingDetails.transactionId | PASSTHROUGH |
| request | checkoutInteractions.actions.url | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |

### Key Response Fields (Status Check)

| APM Field | CH Field | Transform |
|---|---|---|
| txID | transactionProcessingDetails.providerTransactionId | PASSTHROUGH |
| partnerTxID | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| amount | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
