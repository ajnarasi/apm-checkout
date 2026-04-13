# Klarna — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | KLARNA |
| **Display Name** | Klarna |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | https://x.klarnacdn.net/kp/lib/v1/api.js |
| **NPM Package** | N/A |
| **SDK Version** | v1 |
| **Script Loading** | async script tag |
| **Global Variable** | Klarna.Payments |
| **CSP script-src** | x.klarnacdn.net |
| **CSP connect-src** | api-na.playground.klarna.com, api.klarna.com |
| **Sandbox URL** | https://api-na.playground.klarna.com |
| **Sandbox Type** | Live (Klarna Playground) |
| **Auth Scheme** | HTTP Basic (Base64 of API Key:API Secret) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| GB | GBP | UK market |
| DE | EUR | DACH region |
| AT | EUR | DACH region |
| SE | SEK | Nordics |
| NO | NOK | Nordics |
| FI | EUR | Nordics |
| DK | DKK | Nordics |
| NL | EUR | Benelux |
| BE | EUR | Benelux |
| AU | AUD | APAC market |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | $49.99 → 4999 |
| **Type** | Integer (minor units) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with Klarna" | "Pay with Klarna" |
| **Brand Color** | #FFB3C7 (Klarna Pink) | #FFB3C7 |
| **Logo URL** | /logos/klarna.svg | — |

### Promotional Messaging (Klarna On-Site Messaging)

| Property | Options | Default |
|---|---|---|
| **Component** | Klarna OSM | — |
| **Placements** | credit-promotion-badge, credit-promotion-auto-size, top-strip-promotion-badge, top-strip-promotion-auto-size, sidebar-promotion-badge, sidebar-promotion-auto-size, homepage-promotion-badge, homepage-promotion-auto-size | — |
| **Data Attributes** | data-key, data-locale, data-purchase-amount | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Klarna API Key (Username) | Credential vault | Per-region key |
| Klarna API Secret (Password) | Credential vault | HTTP Basic pair |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | No | — |
| Widget/Embedded | Yes | Klarna Payments widget embedded in checkout |
| QR Code | No | — |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

### Test Credentials

| Scenario | Credential | Expected Result |
|---|---|---|
| Approve | customer+us@klarna.com | Payment authorized |
| Decline | customer+us+denied@klarna.com | Payment declined |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Klarna Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { paymentMethodCategories, clientToken } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { authorizationToken, showForm, approvedAmount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { reason } |
| HEIGHT_CHANGED | HEIGHT_CHANGED | { height } |
| OVERLAY_SHOWN | OVERLAY_SHOWN | { } |
| OVERLAY_HIDDEN | OVERLAY_HIDDEN | { } |

### Lifecycle Flow

```
1. loadSDK() → Inject <script src="x.klarnacdn.net/kp/lib/v1/api.js">
2. init(config, eventBus) → POST /api/klarna/session → receive client_token
   → Klarna.Payments.init({ client_token })
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Klarna.Payments.load({ container, payment_method_category })
   → Widget renders inside container
4. authorize(paymentData) → Klarna.Payments.authorize({ payment_method_category }, orderData, callback)
   → Emits: PAYMENT_AUTHORIZED (with authorization_token) or PAYMENT_ERROR
5. getServerHandoff() → { endpoint: '/api/klarna/order', method: 'POST', body: { authorizationToken, amount, currency } }
6. teardown() → Remove widget, clear event bus, destroy Klarna instance
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| SDK init (session create) | 15,000ms | No retry |
| Widget load | 10,000ms | No retry |
| Authorize | 30,000ms | No retry |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Klarna Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_SESSION | VALIDATION_ERROR | Yes | Re-create session |
| CONSUMER_DECLINED | AUTH_FAILED | No | Klarna declined buyer |
| BAD_VALUE | VALIDATION_ERROR | Yes | Malformed request field |
| UNAUTHORIZED | PROVIDER_ERROR | No | Invalid API credentials |
| SERVICE_UNAVAILABLE | PROVIDER_ERROR | Yes (with delay) | Klarna outage |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Session Create | /api/klarna/session | POST | MULTIPLY_100 |
| Order Create | /api/klarna/order | POST | MULTIPLY_100 |
| Capture | /api/klarna/capture | POST | MULTIPLY_100 |
| Refund | /api/klarna/refund | POST | MULTIPLY_100 |

### Key Request Fields (Order Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | order_amount | MULTIPLY_100 | Yes |
| amount.currency | purchase_currency | PASSTHROUGH | Yes |
| customer.email | billing_address.email | PASSTHROUGH | Yes |
| customer.firstName | billing_address.given_name | PASSTHROUGH | Yes |
| customer.lastName | billing_address.family_name | PASSTHROUGH | Yes |
| customerAddress.line1 | billing_address.street_address | PASSTHROUGH | Yes |
| customerAddress.city | billing_address.city | PASSTHROUGH | Yes |
| customerAddress.postalCode | billing_address.postal_code | PASSTHROUGH | Yes |
| customerAddress.country | billing_address.country | PASSTHROUGH | Yes |
| authorizationToken | authorization_token | PASSTHROUGH | Yes |
| orderItems | order_lines[] | MAP_LINE_ITEMS | Yes |

### Key Response Fields (Order Create)

| APM Field | CH Field | Transform |
|---|---|---|
| order_id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| order_amount | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| purchase_currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| fraud_status | gatewayResponse.processor.fraudStatus | MAP_ENUM |
