# Google Pay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | GOOGLEPAY |
| **Display Name** | Google Pay |
| **Pattern** | native-wallet |
| **SDK CDN URL** | https://pay.google.com/gp/p/js/pay.js |
| **NPM Package** | @google-pay/button-element |
| **SDK Version** | v2 (apiVersion: 2, apiVersionMinor: 0) |
| **Script Loading** | async script tag |
| **Global Variable** | google.payments.api.PaymentsClient |
| **CSP script-src** | pay.google.com |
| **CSP connect-src** | pay.google.com |
| **Sandbox URL** | N/A (TEST environment via PaymentsClient constructor) |
| **Sandbox Type** | TEST mode (public, no signup required) |
| **Auth Scheme** | N/A (public SDK key — gateway tokenization uses gateway merchant ID) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market |
| GB | GBP | UK market |
| DE | EUR | Europe |
| AU | AUD | APAC |
| CA | CAD | North America |
| JP | JPY | APAC |
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
| **buttonColor** | default, black, white | default |
| **buttonType** | buy, book, checkout, donate, order, pay, plain, subscribe | buy |
| **buttonSizeMode** | static, fill | static |
| **buttonRadius** | 0-100 (px) | — |
| **buttonLocale** | en, fr, de, ja, etc. | Browser locale |
| **Brand Color** | #4285F4 (Google Blue) | #4285F4 |
| **Logo URL** | /logos/googlepay.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Gateway Merchant ID | Configuration | From payment gateway |
| Gateway | Configuration | e.g., "firstdata", "stripe", "braintree" |
| Merchant ID (Google) | Configuration | Google Pay merchant ID (production) |
| Merchant Name | Configuration | Display name on payment sheet |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | No | — |
| Widget/Embedded | No | — |
| QR Code | No | — |
| Payment Sheet | Yes | Native Google Pay sheet |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Google Pay Event/Callback | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY (isReadyToPay) | { result, apiVersion } |
| PAYMENT_AUTHORIZED | AUTHORIZED (onPaymentAuthorized) | { paymentMethodData: { tokenizationData, info } } |
| PAYMENT_ERROR | ERROR | { statusCode, statusMessage, retryable } |
| SHIPPING_ADDRESS_CHANGED | SHIP_ADDR (onPaymentDataChanged — SHIPPING_ADDRESS) | { shippingAddress } |
| SHIPPING_METHOD_CHANGED | SHIP_METH (onPaymentDataChanged — SHIPPING_OPTION) | { shippingOptionData } |
| COUPON_CODE_CHANGED | COUPON (onPaymentDataChanged — OFFER) | { offerData } |

### Lifecycle Flow

```
1. loadSDK() → Inject <script src="pay.google.com/gp/p/js/pay.js">
2. init(config, eventBus) → new google.payments.api.PaymentsClient({ environment: 'TEST' | 'PRODUCTION' })
   → client.isReadyToPay(isReadyToPayRequest) → check device/browser support
   → Emits: PAYMENT_METHOD_READY
3. render(container) → client.createButton({ onClick, buttonColor, buttonType, buttonSizeMode, buttonRadius })
   → Append button to container
4. authorize(paymentData) → client.loadPaymentData(paymentDataRequest)
   → Google Pay sheet opens → User selects card and authenticates
   → onPaymentAuthorized callback → receive payment token
   → Emits: PAYMENT_AUTHORIZED (with tokenizationData)
5. getServerHandoff() → { endpoint: '/api/googlepay/process', method: 'POST', body: { token, amount, currency } }
6. teardown() → Remove button, clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| isReadyToPay check | 5,000ms | No retry |
| loadPaymentData (payment sheet) | 600,000ms (10 min) | No retry (user-driven) |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Google Pay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| BUYER_ACCOUNT_ERROR | AUTH_FAILED | No | Buyer account issue |
| CANCELED | USER_CANCELLED | No | User dismissed payment sheet |
| DEVELOPER_ERROR | VALIDATION_ERROR | No | Misconfigured request |
| INTERNAL_ERROR | PROVIDER_ERROR | Yes (with delay) | Google Pay internal error |
| NOT_FOUND | VALIDATION_ERROR | No | Payment method not found |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Process Payment | /api/googlepay/process | POST | PASSTHROUGH |

### Key Request Fields (Process Payment)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | transactionInfo.totalPrice | PASSTHROUGH | Yes |
| amount.currency | transactionInfo.currencyCode | PASSTHROUGH | Yes |
| transactionInfo.totalPriceStatus | totalPriceStatus | HARDCODE("FINAL") | Yes |
| paymentMethodData.tokenizationData.token | paymentToken | PASSTHROUGH | Yes |
| paymentMethodData.info.cardNetwork | cardNetwork | PASSTHROUGH | No |
| customerAddress.country | transactionInfo.countryCode | PASSTHROUGH | Yes |
| allowedPaymentMethods | allowedPaymentMethods | PASSTHROUGH (CARD, TOKENIZED_CARD) | Yes |
| allowedCardNetworks | allowedCardNetworks | PASSTHROUGH (VISA, MASTERCARD, AMEX, DISCOVER) | Yes |
| gatewayMerchantId | tokenizationSpecification.parameters.gatewayMerchantId | PASSTHROUGH | Yes |

### Key Response Fields (Process Payment)

| APM Field | CH Field | Transform |
|---|---|---|
| transactionId | transactionProcessingDetails.transactionId | PASSTHROUGH |
| status | gatewayResponse.transactionState | MAP_ENUM |
| amount | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| cardNetwork | paymentReceipt.cardNetwork | PASSTHROUGH |
| cardDetails | paymentReceipt.cardLastFour | PASSTHROUGH |
