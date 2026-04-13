# PayPal — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | PAYPAL |
| **Display Name** | PayPal |
| **Pattern** | redirect-wallet |
| **SDK CDN URL** | https://www.paypal.com/sdk/js |
| **NPM Package** | @paypal/paypal-js |
| **SDK Version** | v5 |
| **Script Loading** | async script tag with query params (client-id, currency, intent) |
| **Global Variable** | paypal |
| **CSP script-src** | www.paypal.com |
| **CSP connect-src** | www.sandbox.paypal.com, www.paypal.com, api.sandbox.paypal.com, api.paypal.com |
| **Sandbox URL** | https://www.sandbox.paypal.com |
| **Sandbox Type** | Signup (PayPal Developer sandbox accounts) |
| **Auth Scheme** | OAuth2 (Client ID + Secret → Bearer token) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| GB | GBP | UK market |
| DE | EUR | Europe |
| AU | AUD | APAC |
| CA | CAD | North America |
| 200+ countries | 25+ currencies | Global coverage |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format, PayPal handles natively) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **color** | gold, blue, silver, white, black | gold |
| **shape** | rect, pill, sharp | rect |
| **height** | 25-55px | 40px |
| **label** | paypal, checkout, buynow, pay, installment | paypal |
| **layout** | vertical, horizontal | vertical |
| **tagline** | true, false | true |
| **Brand Color** | #003087 (PayPal Blue) | #003087 |
| **Logo URL** | /logos/paypal.svg | — |

### Promotional Messaging

| Property | Options | Default |
|---|---|---|
| **Component** | PayPal Messages | — |
| **data-pp-message** | — | — |
| **data-pp-amount** | Numeric amount | — |
| **data-pp-style-layout** | text, flex | text |
| **data-pp-style-logo-type** | primary, alternative, inline, none | primary |
| **data-pp-style-text-color** | black, white, monochrome, grayscale | black |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Client ID | Credential vault | PayPal developer portal |
| Client Secret | Credential vault | For OAuth2 token exchange |
| Merchant ID | Configuration | PayPal merchant account ID |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Pop-up window or redirect to PayPal |
| Widget/Embedded | Yes | Smart Payment Buttons embedded in checkout |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | PayPal Event/Callback | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY (onInit) | { isEligible } |
| PAYMENT_AUTHORIZED | AUTHORIZED (onApprove) | { orderID, payerID, facilitatorAccessToken } |
| PAYMENT_ERROR | ERROR (onError) | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED (onCancel) | { orderID } |
| SHIPPING_ADDRESS_CHANGED | SHIP_ADDR (onShippingAddressChange) | { shippingAddress } |
| SHIPPING_METHOD_CHANGED | SHIP_METH (onShippingOptionsChange) | { selectedShippingOption } |

### Lifecycle Flow

```
1. loadSDK() → Inject <script src="paypal.com/sdk/js?client-id=X&currency=USD&intent=capture">
2. init(config, eventBus) → paypal.Buttons({...}).render(container)
   → Emits: PAYMENT_METHOD_READY
3. render(container) → PayPal Smart Buttons rendered (color, shape, height, label config)
4. authorize(paymentData) → createOrder callback fires → POST /api/paypal/order → receive orderID
   → PayPal pop-up/redirect opens → User logs in and approves
   → onApprove callback fires → Emits: PAYMENT_AUTHORIZED (with orderID, payerID)
5. capture() → POST /api/paypal/order/{orderID}/capture (server-side)
6. getServerHandoff() → { endpoint: '/api/paypal/order', method: 'POST', body: { amount, currency, intent } }
7. teardown() → paypal.Buttons().close(), clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| SDK init (button render) | 10,000ms | No retry |
| Order create (server call) | 15,000ms | No retry |
| Authorize (pop-up/redirect) | 600,000ms (10 min) | No retry (user-driven) |
| Capture (server handoff) | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| PayPal Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_PARAMETER_VALUE | VALIDATION_ERROR | Yes | Malformed request field |
| RESOURCE_NOT_FOUND | VALIDATION_ERROR | No | Order not found |
| NOT_AUTHORIZED | PROVIDER_ERROR | No | Invalid OAuth credentials |
| INSTRUMENT_DECLINED | AUTH_FAILED | Yes | Payment instrument declined |
| PAYER_ACTION_REQUIRED | PENDING | Yes | Buyer must complete action |
| INTERNAL_SERVER_ERROR | PROVIDER_ERROR | Yes (with delay) | PayPal outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Order Create | /api/paypal/order | POST | PASSTHROUGH |
| Order Capture | /api/paypal/order/{orderID}/capture | POST | — |

### Key Request Fields (Order Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | purchase_units[0].amount.value | PASSTHROUGH | Yes |
| amount.currency | purchase_units[0].amount.currency_code | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | purchase_units[0].reference_id | PASSTHROUGH | No |
| transactionDetails.description | purchase_units[0].description | PASSTHROUGH | No |
| intent | intent | HARDCODE("CAPTURE") | Yes |
| customer.email | payer.email_address | PASSTHROUGH | No |
| customerAddress.line1 | purchase_units[0].shipping.address.address_line_1 | PASSTHROUGH | No |
| customerAddress.city | purchase_units[0].shipping.address.admin_area_2 | PASSTHROUGH | No |
| customerAddress.state | purchase_units[0].shipping.address.admin_area_1 | PASSTHROUGH | No |
| customerAddress.postalCode | purchase_units[0].shipping.address.postal_code | PASSTHROUGH | No |
| customerAddress.country | purchase_units[0].shipping.address.country_code | PASSTHROUGH | No |

### Key Response Fields (Order Create)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| links[rel=approve].href | checkoutInteractions.actions.url | PASSTHROUGH |

### Key Response Fields (Capture)

| APM Field | CH Field | Transform |
|---|---|---|
| id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| purchase_units[0].payments.captures[0].amount.value | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| purchase_units[0].payments.captures[0].amount.currency_code | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| payer.email_address | paymentReceipt.payerEmail | PASSTHROUGH |
