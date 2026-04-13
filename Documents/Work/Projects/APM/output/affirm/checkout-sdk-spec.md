# Affirm — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | AFFIRM |
| **Display Name** | Affirm |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | https://cdn1.affirm.com/js/v2/affirm.js |
| **NPM Package** | N/A |
| **SDK Version** | v2 |
| **Script Loading** | async script tag (inline config block + script) |
| **Global Variable** | affirm |
| **CSP script-src** | cdn1.affirm.com |
| **CSP connect-src** | sandbox.affirm.com, api.affirm.com |
| **Sandbox URL** | https://sandbox.affirm.com |
| **Sandbox Type** | Signup (Affirm Developer sandbox) |
| **Auth Scheme** | API Key (public key client-side, private key server-side) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market (US only) |
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
| **Button Label** | "Pay with Affirm" | "Pay with Affirm" |
| **Brand Color** | #4A4AF4 (Affirm Blue) | #4A4AF4 |
| **Logo URL** | /logos/affirm.svg | — |

### Promotional Messaging

| Property | Options | Default |
|---|---|---|
| **Component** | `<affirm-as-low-as>` / affirm.ui.ready() | — |
| **affirmLogoType** | logo, text, symbol | logo |
| **affirmLogoColor** | blue, black, white | blue |
| **learnMoreShow** | true, false | true |
| **pageType** | product, category, cart, payment, banner, homepage | product |
| **data-amount** | Amount in cents | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Public API Key | Configuration | Client-side init (starts with "public_") |
| Private API Key | Credential vault | Server-side auth |
| Financial Product Key | Configuration | Optional, for specific lending programs |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Affirm checkout modal/redirect |
| Widget/Embedded | Yes | Affirm checkout flow opens as overlay |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

### Test Credentials

| Verification Code | Expected Result |
|---|---|
| 123456 | Payment approved |
| 1234 | Payment declined |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Affirm Event/Callback | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY (affirm.ui.ready) | { isEligible, loanAmount } |
| PAYMENT_AUTHORIZED | AUTHORIZED (onSuccess) | { checkout_token, created } |
| PAYMENT_ERROR | ERROR (onFail) | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED (onClose without success) | { reason } |
| OVERLAY_SHOWN | OVERLAY_SHOWN (checkout open) | { } |
| OVERLAY_HIDDEN | OVERLAY_HIDDEN (checkout close) | { } |

### Lifecycle Flow

```
1. loadSDK() → Inject affirm config block + <script src="cdn1.affirm.com/js/v2/affirm.js">
   → affirm.config = { public_api_key, script, locale, country_code }
2. init(config, eventBus) → affirm.ui.ready(callback)
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Render branded "Affirm" button + <affirm-as-low-as> promo widget
4. authorize(paymentData) → affirm.checkout({ merchant, shipping, billing, items, metadata,
     onFail, onSuccess })
   → Emits: OVERLAY_SHOWN
   → Affirm checkout modal opens → User selects loan terms, verifies phone
   → On success: Emits PAYMENT_AUTHORIZED (with checkout_token)
   → On fail: Emits PAYMENT_ERROR
   → On close: Emits OVERLAY_HIDDEN
5. capture() → POST /api/affirm/checkout with checkout_token (server-side)
6. getServerHandoff() → { endpoint: '/api/affirm/checkout', method: 'POST', body: { checkoutToken, amount, currency } }
7. teardown() → Close modal, clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| SDK init (ui.ready) | 10,000ms | No retry |
| Checkout modal (user-driven) | 600,000ms (10 min) | No retry |
| Capture (server handoff) | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Affirm Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| invalid_request | VALIDATION_ERROR | Yes | Malformed checkout request |
| auth_declined | AUTH_FAILED | No | Affirm declined buyer |
| invalid_field | VALIDATION_ERROR | Yes | Missing or bad field value |
| checkout_token_expired | VALIDATION_ERROR | Yes | Token expired, re-create |
| service_unavailable | PROVIDER_ERROR | Yes (with delay) | Affirm outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Checkout/Capture | /api/affirm/checkout | POST | MULTIPLY_100 |

### Key Request Fields (Checkout)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | total | MULTIPLY_100 | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| customer.email | billing.email | PASSTHROUGH | Yes |
| customer.firstName | billing.name.first | PASSTHROUGH | Yes |
| customer.lastName | billing.name.last | PASSTHROUGH | Yes |
| customer.phone | billing.phone_number | PASSTHROUGH | Yes |
| customerAddress.line1 | billing.address.line1 | PASSTHROUGH | Yes |
| customerAddress.city | billing.address.city | PASSTHROUGH | Yes |
| customerAddress.state | billing.address.state | PASSTHROUGH | Yes |
| customerAddress.postalCode | billing.address.zipcode | PASSTHROUGH | Yes |
| customerAddress.country | billing.address.country | PASSTHROUGH | Yes |
| orderItems | items[] | MAP_LINE_ITEMS | Yes |
| checkoutToken | checkout_token | PASSTHROUGH | Yes (capture) |

### Key Response Fields (Checkout)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| checkout_token | transactionProcessingDetails.checkoutToken | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| amount | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| created | paymentReceipt.transactionTimestamp | PASSTHROUGH |
