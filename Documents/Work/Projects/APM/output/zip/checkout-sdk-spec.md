# Zip — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | ZIP |
| **Display Name** | Zip (Quadpay) |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | https://quadpay.com/sdk/v2/quadpay.js |
| **NPM Package** | N/A |
| **SDK Version** | v2 |
| **Script Loading** | async script tag |
| **Global Variable** | Quadpay |
| **CSP script-src** | quadpay.com |
| **CSP connect-src** | Internal API only |
| **Sandbox URL** | N/A (mock environment) |
| **Sandbox Type** | Mock |
| **Auth Scheme** | HMAC-SHA256 (signed request body) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| AU | AUD | Australia |
| NZ | NZD | New Zealand |
| GB | GBP | UK market |
| CA | CAD | Canada |
| ZA | ZAR | South Africa |
| MX | MXN | Mexico |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with Zip" | "Pay with Zip" |
| **Brand Color** | #AA8FFF (Zip Purple) | #AA8FFF |
| **Logo URL** | /logos/zip.svg | — |

### Promotional Messaging

| Property | Options | Default |
|---|---|---|
| **Component** | `<quadpay-widget-v3>` | — |
| **logoOption** | color, white, grey, black | color |
| **priceColor** | CSS color value | inherit |
| **widgetVerbiage** | "4 interest-free payments of", custom text | "4 interest-free payments of" |
| **data-amount** | Decimal amount | — |
| **data-currency** | Currency code | USD |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Merchant ID | Configuration | Zip merchant portal |
| API Key | Credential vault | For HMAC-SHA256 signing |
| Widget Merchant ID | Configuration | For promo widget rendering |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Redirect to Zip checkout overlay |
| Widget/Embedded | Yes | Zip overlay within merchant page |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Zip Event/Callback | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { isEligible, merchantId } |
| PAYMENT_AUTHORIZED | AUTHORIZED (complete) | { orderId, token, status } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED (close without complete) | { reason } |
| OVERLAY_SHOWN | OVERLAY_SHOWN | { } |
| OVERLAY_HIDDEN | OVERLAY_HIDDEN | { } |

### Lifecycle Flow

```
1. loadSDK() → Inject <script src="quadpay.com/sdk/v2/quadpay.js">
2. init(config, eventBus) → Quadpay.init({ merchantId })
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Render branded "Zip" button + <quadpay-widget-v3> promo
4. authorize(paymentData) → POST /api/zip/checkout → receive checkout token
   → Quadpay.checkout({ token }) → opens Zip overlay
   → Emits: OVERLAY_SHOWN
   → User completes installment selection
   → On complete: Emits PAYMENT_AUTHORIZED (with orderId, token)
   → On cancel: Emits PAYMENT_CANCELLED
   → Emits: OVERLAY_HIDDEN
5. getServerHandoff() → { endpoint: '/api/zip/checkout', method: 'POST', body: { amount, currency, items } }
6. teardown() → Close overlay, clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| SDK init | 10,000ms | No retry |
| Checkout create (server call) | 30,000ms | No retry |
| Overlay (user-driven) | 600,000ms (10 min) | No retry |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Zip Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | Yes | Malformed request |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid HMAC or API key |
| CUSTOMER_DECLINED | AUTH_FAILED | No | Zip declined buyer |
| TOKEN_EXPIRED | VALIDATION_ERROR | Yes | Re-create checkout |
| AMOUNT_OUT_OF_RANGE | VALIDATION_ERROR | No | Below min or above max |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | Zip outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Checkout Create | /api/zip/checkout | POST | PASSTHROUGH |

### Key Request Fields (Checkout Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount | PASSTHROUGH | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | merchantReference | PASSTHROUGH | Yes |
| customer.email | customer.email | PASSTHROUGH | Yes |
| customer.firstName | customer.firstName | PASSTHROUGH | Yes |
| customer.lastName | customer.lastName | PASSTHROUGH | Yes |
| customer.phone | customer.phoneNumber | PASSTHROUGH | No |
| customerAddress.line1 | billing.line1 | PASSTHROUGH | Yes |
| customerAddress.city | billing.city | PASSTHROUGH | Yes |
| customerAddress.state | billing.state | PASSTHROUGH | Yes |
| customerAddress.postalCode | billing.postalCode | PASSTHROUGH | Yes |
| customerAddress.country | billing.country | PASSTHROUGH | Yes |
| orderItems | items[] | MAP_LINE_ITEMS | Yes |
| checkoutInteractions.returnUrls.successUrl | merchant.redirectConfirmUrl | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.cancelUrl | merchant.redirectCancelUrl | PASSTHROUGH | Yes |

### Key Response Fields (Checkout Create)

| APM Field | CH Field | Transform |
|---|---|---|
| orderId | transactionProcessingDetails.transactionId | PASSTHROUGH |
| token | transactionProcessingDetails.checkoutToken | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| amount | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
