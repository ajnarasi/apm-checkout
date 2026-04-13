# Apple Pay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | APPLEPAY |
| **Display Name** | Apple Pay |
| **Pattern** | native-wallet |
| **SDK CDN URL** | N/A — Browser native ApplePaySession API |
| **NPM Package** | N/A |
| **SDK Version** | ApplePaySession version 14 |
| **Script Loading** | none (native browser API in Safari/WebKit) |
| **Global Variable** | window.ApplePaySession |
| **CSP script-src** | N/A |
| **CSP connect-src** | apple-pay-gateway.apple.com, apple-pay-gateway-cert.apple.com |
| **Sandbox URL** | Apple Developer sandbox (no separate URL) |
| **Sandbox Type** | Live (Apple Developer account, merchant ID: merchant.app.vercel.hottopic) |
| **Auth Scheme** | mTLS certificate (merchant identity certificate) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| GB | GBP | UK market |
| CA | CAD | North America |
| AU | AUD | APAC |
| DE | EUR | Europe |
| FR | EUR | Europe |
| JP | JPY | APAC |
| CN | CNY | China |
| 70+ countries | Multiple | Broad global coverage |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Element** | `<apple-pay-button>` | — |
| **buttonstyle** | black, white, white-outline | black |
| **type (26 options)** | plain, buy, set-up, donate, check-out, book, subscribe, reload, add-money, top-up, order, rent, support, contribute, tip, pay, continue, and more | plain |
| **locale** | en, fr, de, ja, zh, etc. | Browser locale |
| **Brand Color** | #000000 (Apple Black) | #000000 |
| **Logo URL** | /logos/applepay.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Merchant Identity Certificate | Credential vault (PEM) | mTLS cert for payment session |
| Merchant ID | Configuration | e.g., merchant.app.vercel.hottopic |
| Payment Processing Certificate | Credential vault | Decrypts payment token |
| Domain Verification File | Static hosting | /.well-known/apple-developer-merchantid-domain-association |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | No | — |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | Yes | Native Apple Pay sheet via ApplePaySession |
| Voucher/Reference | No | — |

### Test Cards

| Network | Card Number | Notes |
|---|---|---|
| Visa | 4761120010000492 | Test card (sandbox) |
| Mastercard | 5204247750001471 | Test card (sandbox) |
| Amex | 349956959041362 | Test card (sandbox) |
| Discover | 6011000994462948 | Test card (sandbox) |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Apple Pay Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY (canMakePayments) | { canMakePayments, version } |
| PAYMENT_AUTHORIZED | AUTHORIZED (onpaymentauthorized) | { payment: { token, billingContact, shippingContact } } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED (oncancel) | { } |
| SHIPPING_ADDRESS_CHANGED | SHIP_ADDR (onshippingcontactselected) | { shippingContact } |
| SHIPPING_METHOD_CHANGED | SHIP_METH (onshippingmethodselected) | { shippingMethod } |
| COUPON_CODE_CHANGED | COUPON (oncouponcodechanged) | { couponCode } |
| PAYMENT_METHOD_SELECTED | CARD_SEL (onpaymentmethodselected) | { paymentMethod } |
| BILLING_CONTACT_SELECTED | BILLING (onbillingcontactselected) | { billingContact } |

### Lifecycle Flow

```
1. loadSDK() → No-op (browser native — check window.ApplePaySession exists)
2. init(config, eventBus) → ApplePaySession.canMakePayments() → check device/browser support
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Render <apple-pay-button> element (buttonstyle, type)
4. authorize(paymentData) → new ApplePaySession(version, paymentRequest)
   → session.onvalidatemerchant → POST /api/applepay/session → receive merchantSession
   → session.completeMerchantValidation(merchantSession)
   → User authenticates via Face ID / Touch ID / passcode
   → session.onpaymentauthorized → receive payment token
   → Emits: PAYMENT_AUTHORIZED (with encrypted token)
5. getServerHandoff() → { endpoint: '/api/applepay/session', method: 'POST', body: { validationURL, domainName } }
6. teardown() → session.abort(), clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (browser native) |
| canMakePayments check | 2,000ms | No retry |
| Merchant validation | 30,000ms | No retry (Apple enforces 30s) |
| Payment sheet (user auth) | 600,000ms (10 min) | No retry (user-driven) |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Apple Pay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| InvalidAccessError | VALIDATION_ERROR | No | Session already active |
| SecurityError | PROVIDER_ERROR | No | Insecure context (non-HTTPS) |
| Merchant validation fail | PROVIDER_ERROR | Yes | Re-validate merchant session |
| User cancelled (oncancel) | USER_CANCELLED | No | User dismissed payment sheet |
| statusFail | AUTH_FAILED | No | Payment processing failed |
| Network error | PROVIDER_ERROR | Yes (with delay) | Apple Pay service unavailable |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Merchant Validation | /api/applepay/session | POST | N/A |
| Payment Processing | (via card network — token decrypted server-side) | POST | PASSTHROUGH |

### Key Request Fields (Merchant Validation)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| validationURL | validationURL | PASSTHROUGH | Yes |
| merchantIdentifier | merchantIdentifier | PASSTHROUGH | Yes |
| displayName | displayName | PASSTHROUGH | Yes |
| domainName | domainName | PASSTHROUGH | Yes |
| initiative | initiative | HARDCODE("web") | Yes |
| initiativeContext | initiativeContext | PASSTHROUGH (merchant domain) | Yes |

### Key Request Fields (Payment Request Object)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | total.amount | PASSTHROUGH | Yes |
| amount.currency | currencyCode | PASSTHROUGH | Yes |
| customerAddress.country | countryCode | PASSTHROUGH | Yes |
| orderItems | lineItems[] | MAP_LINE_ITEMS | No |
| shippingOptions | shippingMethods[] | MAP_SHIPPING | No |
| requiredBillingContactFields | requiredBillingContactFields | PASSTHROUGH | No |
| requiredShippingContactFields | requiredShippingContactFields | PASSTHROUGH | No |
| supportedNetworks | supportedNetworks | PASSTHROUGH (visa, masterCard, amex, discover) | Yes |
| merchantCapabilities | merchantCapabilities | PASSTHROUGH (supports3DS, supportsDebit, supportsCredit) | Yes |

### Key Response Fields (Payment Token)

| APM Field | CH Field | Transform |
|---|---|---|
| payment.token.paymentData | transactionProcessingDetails.encryptedPaymentToken | BASE64_ENCODE |
| payment.token.paymentMethod.network | paymentReceipt.cardNetwork | MAP_ENUM |
| payment.token.paymentMethod.displayName | paymentReceipt.cardDisplayName | PASSTHROUGH |
| payment.token.transactionIdentifier | transactionProcessingDetails.transactionId | PASSTHROUGH |
| payment.billingContact | paymentReceipt.billingAddress | MAP_CONTACT |
| payment.shippingContact | paymentReceipt.shippingAddress | MAP_CONTACT |
