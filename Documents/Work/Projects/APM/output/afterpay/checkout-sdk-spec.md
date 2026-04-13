# Afterpay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | AFTERPAY |
| **Display Name** | Afterpay |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | N/A — server-side redirect flow |
| **NPM Package** | N/A |
| **SDK Version** | N/A |
| **Script Loading** | none |
| **Global Variable** | N/A |
| **CSP script-src** | N/A |
| **CSP connect-src** | global-api-sandbox.afterpay.com, global-api.afterpay.com |
| **Sandbox URL** | https://global-api-sandbox.afterpay.com |
| **Sandbox Type** | Mock (Afterpay sandbox) |
| **Auth Scheme** | HTTP Basic (Merchant ID:Secret Key) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| AU | AUD | Founding market |
| NZ | NZD | APAC |
| GB | GBP | UK market |
| CA | CAD | North America |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | NUMBER_TO_STRING |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with Afterpay" | "Pay with Afterpay" |
| **Brand Color** | #B2FCE4 (Afterpay Mint) | #B2FCE4 |
| **Logo URL** | /logos/afterpay.svg | — |

### Promotional Messaging

| Property | Options | Default |
|---|---|---|
| **Component** | `<afterpay-placement>` | — |
| **badgeTheme** | black, white, mint | black |
| **modalLinkStyle** | circled-info-icon, more-info-text, learn-more-text, none | circled-info-icon |
| **size** | sm, md, lg | md |
| **Data Attributes** | data-amount, data-currency, data-locale | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Merchant ID | Credential vault | Afterpay merchant portal |
| Secret Key | Credential vault | HTTP Basic pair |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Server-side redirect to Afterpay checkout |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

### Test Credentials

| Card Number | CVV | Expected Result |
|---|---|---|
| 4111111111111111 (Visa) | 000 | Payment approved |
| 4111111111111111 (Visa) | 051 | Payment declined |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Afterpay Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { checkoutToken, redirectUrl } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { orderId, status, token } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { token, status } |
| REDIRECT_REQUIRED | REDIRECT | { redirectCheckoutUrl } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side redirect flow)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "Afterpay" button + <afterpay-placement> promo
4. authorize(paymentData) → POST /api/afterpay/checkout → receive token + redirectCheckoutUrl
   → Emits: PAYMENT_METHOD_READY
   → Then: Redirect customer to Afterpay checkout page
   → Emits: REDIRECT_REQUIRED
5. handleRedirectReturn(params) → Extract token + status from return URL query params
   → If status=SUCCESS: POST /api/afterpay/capture with token
   → Emits: PAYMENT_AUTHORIZED or PAYMENT_CANCELLED
6. getServerHandoff() → { endpoint: '/api/afterpay/capture', method: 'POST', body: { token, amount, currency } }
7. teardown() → Clear event bus, config
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Checkout create | 30,000ms | No retry |
| Redirect return | 600,000ms (10 min) | No retry (user-driven) |
| Capture (server handoff) | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Afterpay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_OBJECT | VALIDATION_ERROR | Yes | Malformed request |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid credentials |
| DECLINED | AUTH_FAILED | No | Afterpay declined buyer |
| INVALID_TOKEN | VALIDATION_ERROR | Yes | Expired or invalid token |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | Afterpay outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Checkout Create | /api/afterpay/checkout | POST | NUMBER_TO_STRING |
| Capture | /api/afterpay/capture | POST | NUMBER_TO_STRING |

### Key Request Fields (Checkout Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount.amount | NUMBER_TO_STRING | Yes |
| amount.currency | amount.currency | PASSTHROUGH | Yes |
| customer.email | consumer.email | PASSTHROUGH | Yes |
| customer.firstName | consumer.givenNames | PASSTHROUGH | Yes |
| customer.lastName | consumer.surname | PASSTHROUGH | Yes |
| customer.phone | consumer.phoneNumber | PASSTHROUGH | No |
| customerAddress.line1 | shipping.line1 | PASSTHROUGH | Yes |
| customerAddress.city | shipping.area1 | PASSTHROUGH | Yes |
| customerAddress.state | shipping.region | PASSTHROUGH | Yes |
| customerAddress.postalCode | shipping.postcode | PASSTHROUGH | Yes |
| customerAddress.country | shipping.countryCode | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.successUrl | merchant.redirectConfirmUrl | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.cancelUrl | merchant.redirectCancelUrl | PASSTHROUGH | Yes |

### Key Response Fields (Checkout Create)

| APM Field | CH Field | Transform |
|---|---|---|
| token | transactionProcessingDetails.transactionToken | PASSTHROUGH |
| redirectCheckoutUrl | checkoutInteractions.actions.url | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |

### Key Response Fields (Capture)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| totalAmount.amount | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| totalAmount.currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
