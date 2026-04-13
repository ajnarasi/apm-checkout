# TabaPay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | TABAPAY |
| **Display Name** | TabaPay |
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
| **Auth Scheme** | API Key (Bearer token) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market (US disbursements/push-to-card) |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with TabaPay" | "Pay with TabaPay" |
| **Brand Color** | #0066CC (TabaPay Blue) | #0066CC |
| **Logo URL** | /logos/tabapay.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| API Key | Credential vault | TabaPay merchant portal |
| Client ID | Configuration | TabaPay client identifier |
| Sub-Client ID | Configuration | Optional sub-merchant identifier |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Server-side redirect flow |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | TabaPay Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { sessionId, redirectUrl } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { transactionId, status, amount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| REDIRECT_REQUIRED | REDIRECT | { redirectUrl } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side redirect flow)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "TabaPay" button
4. authorize(paymentData) → POST /api/tabapay/session → receive session_id + redirect URL
   → Emits: PAYMENT_METHOD_READY
   → Redirect customer to TabaPay session page
   → Emits: REDIRECT_REQUIRED
5. handleRedirectReturn(params) → Extract status from return URL query params
   → If status=COMPLETED: Emits PAYMENT_AUTHORIZED
   → If status=FAILED: Emits PAYMENT_ERROR
6. getServerHandoff() → { endpoint: '/api/tabapay/session', method: 'POST', body: { amount, currency } }
7. teardown() → Clear event bus, config
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Session create (server call) | 30,000ms | No retry |
| Redirect return (user-driven) | 600,000ms (10 min) | No retry |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| TabaPay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | Yes | Malformed request parameters |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid API key |
| SESSION_EXPIRED | VALIDATION_ERROR | Yes | Re-create session |
| TRANSACTION_DECLINED | AUTH_FAILED | No | Payment declined |
| DUPLICATE_TRANSACTION | VALIDATION_ERROR | No | Idempotent request collision |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | TabaPay outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Session Create | /api/tabapay/session | POST | PASSTHROUGH |

### Key Request Fields (Session Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount | PASSTHROUGH | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | referenceID | PASSTHROUGH | Yes |
| customer.firstName | accountHolder.name.first | PASSTHROUGH | Yes |
| customer.lastName | accountHolder.name.last | PASSTHROUGH | Yes |
| customer.email | accountHolder.email | PASSTHROUGH | No |
| customerAddress.line1 | accountHolder.address.line1 | PASSTHROUGH | No |
| customerAddress.city | accountHolder.address.city | PASSTHROUGH | No |
| customerAddress.state | accountHolder.address.state | PASSTHROUGH | No |
| customerAddress.postalCode | accountHolder.address.zipCode | PASSTHROUGH | No |
| customerAddress.country | accountHolder.address.country | PASSTHROUGH | No |
| checkoutInteractions.returnUrls.successUrl | returnURL | PASSTHROUGH | Yes |

### Key Response Fields (Session Create)

| APM Field | CH Field | Transform |
|---|---|---|
| transactionID | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| redirectURL | checkoutInteractions.actions.url | PASSTHROUGH |
| settlementAmount | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| networkRC | gatewayResponse.processor.responseCode | PASSTHROUGH |
