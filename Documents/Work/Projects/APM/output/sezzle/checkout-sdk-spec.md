# Sezzle — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | SEZZLE |
| **Display Name** | Sezzle |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | N/A — server-side redirect flow |
| **NPM Package** | N/A |
| **SDK Version** | N/A |
| **Script Loading** | none (widget script loaded separately for promo) |
| **Global Variable** | N/A |
| **CSP script-src** | widget.sezzle.com (promo widget only) |
| **CSP connect-src** | Internal API only |
| **Sandbox URL** | N/A (mock environment) |
| **Sandbox Type** | Mock |
| **Auth Scheme** | API Key (Bearer token) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| CA | CAD | Canada |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | $49.99 → 4999 |
| **Type** | Integer (minor units — cents) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with Sezzle" | "Pay with Sezzle" |
| **Brand Color** | #382757 (Sezzle Purple) | #382757 |
| **Logo URL** | /logos/sezzle.svg | — |

### Promotional Messaging (Sezzle Widget)

| Property | Options | Default |
|---|---|---|
| **Component** | Sezzle Widget (sezzle-widget) | — |
| **theme** | dark, light, black-flat, white-flat | dark |
| **minPrice** | Minimum eligible amount (cents) | 0 |
| **maxPrice** | Maximum eligible amount (cents) | 250000 |
| **data-amount** | Price in cents | — |
| **data-currency** | Currency code | USD |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| API Key (Public) | Configuration | Sezzle merchant dashboard |
| API Key (Private) | Credential vault | For server-side authentication |
| Merchant UUID | Configuration | Sezzle merchant identifier |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Server-side redirect to Sezzle checkout |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Sezzle Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { sessionUuid, checkoutUrl } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { orderUuid, status, amount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { sessionUuid, reason } |
| REDIRECT_REQUIRED | REDIRECT | { checkoutUrl } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side redirect flow); optionally load Sezzle widget for promo
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "Sezzle" button + promo widget (theme, minPrice, maxPrice)
4. authorize(paymentData) → POST /api/sezzle/checkout → receive checkout_url
   → Emits: PAYMENT_METHOD_READY
   → Redirect customer to Sezzle checkout page
   → Emits: REDIRECT_REQUIRED
5. handleRedirectReturn(params) → Extract status from return URL query params
   → If status=APPROVED: Emits PAYMENT_AUTHORIZED
   → If status=CANCELLED: Emits PAYMENT_CANCELLED
6. getServerHandoff() → { endpoint: '/api/sezzle/checkout', method: 'POST', body: { amount, currency, items } }
7. teardown() → Clear event bus, config
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK for checkout) |
| SDK init | 5,000ms | No retry |
| Checkout create (server call) | 30,000ms | No retry |
| Redirect return (user-driven) | 600,000ms (10 min) | No retry |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Sezzle Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_REQUEST | VALIDATION_ERROR | Yes | Malformed request |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid API key |
| CUSTOMER_DECLINED | AUTH_FAILED | No | Sezzle declined buyer |
| SESSION_EXPIRED | VALIDATION_ERROR | Yes | Re-create checkout session |
| AMOUNT_OUT_OF_RANGE | VALIDATION_ERROR | No | Below min or above max |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | Sezzle outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Checkout Create | /api/sezzle/checkout | POST | MULTIPLY_100 |

### Key Request Fields (Checkout Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount_in_cents | MULTIPLY_100 | Yes |
| amount.currency | currency_code | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | reference_id | PASSTHROUGH | Yes |
| customer.email | customer.email | PASSTHROUGH | Yes |
| customer.firstName | customer.first_name | PASSTHROUGH | Yes |
| customer.lastName | customer.last_name | PASSTHROUGH | Yes |
| customer.phone | customer.phone | PASSTHROUGH | No |
| customerAddress.line1 | billing_address.street | PASSTHROUGH | Yes |
| customerAddress.city | billing_address.city | PASSTHROUGH | Yes |
| customerAddress.state | billing_address.state | PASSTHROUGH | Yes |
| customerAddress.postalCode | billing_address.postal_code | PASSTHROUGH | Yes |
| customerAddress.country | billing_address.country_code | PASSTHROUGH | Yes |
| orderItems | items[] | MAP_LINE_ITEMS | Yes |
| checkoutInteractions.returnUrls.successUrl | checkout_complete_url | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.cancelUrl | checkout_cancel_url | PASSTHROUGH | Yes |

### Key Response Fields (Checkout Create)

| APM Field | CH Field | Transform |
|---|---|---|
| uuid | transactionProcessingDetails.transactionId | PASSTHROUGH |
| checkout_url | checkoutInteractions.actions.url | PASSTHROUGH |
| order.uuid | transactionProcessingDetails.orderUuid | PASSTHROUGH |
| order.status | gatewayResponse.transactionState | MAP_ENUM |
| order.amount_in_cents | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| order.currency_code | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
