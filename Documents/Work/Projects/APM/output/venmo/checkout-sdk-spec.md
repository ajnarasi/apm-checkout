# Venmo — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | VENMO |
| **Display Name** | Venmo |
| **Pattern** | redirect-wallet |
| **SDK CDN URL** | Braintree SDK (braintree-web/venmo) |
| **NPM Package** | braintree-web |
| **SDK Version** | Braintree JS SDK v3 |
| **Script Loading** | Module import (braintree.client + braintree.venmo) |
| **Global Variable** | braintree.venmo |
| **CSP script-src** | js.braintreegateway.com |
| **CSP connect-src** | api.sandbox.braintreegateway.com, api.braintreegateway.com |
| **Sandbox URL** | Braintree sandbox environment |
| **Sandbox Type** | Signup (Braintree Developer sandbox) |
| **Auth Scheme** | Braintree authorization (client token or tokenization key) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | US only (Venmo is US-exclusive) |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format, via Braintree) |

### Button/UI Configuration (22 Config Options)

| Property | Options | Default |
|---|---|---|
| **allowDesktop** | true, false | false |
| **allowDesktopWebLogin** | true, false | false |
| **mobileWebFallBack** | true, false | false |
| **paymentMethodUsage** | multi_use, single_use | multi_use |
| **allowNewBrowserTab** | true, false | true |
| **ignoreHistoryChanges** | true, false | false |
| **profileId** | Merchant profile ID | — |
| **deepLinkReturnUrl** | Return URL for deep link | — |
| **useTestNonce** | true, false | false |
| **desktopFlow** | qr-code, popup | popup |
| **isBraintreeAuth** | true, false | true |
| **Button Label** | "Pay with Venmo" | "Pay with Venmo" |
| **Brand Color** | #3D95CE (Venmo Blue) | #3D95CE |
| **Logo URL** | /logos/venmo.svg | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Braintree Client Token | Server-generated | Per-session, from Braintree gateway |
| Braintree Merchant ID | Configuration | Braintree merchant account |
| Braintree Public Key | Configuration | Braintree API public key |
| Braintree Private Key | Credential vault | Braintree API private key |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Mobile deep-link to Venmo app |
| Widget/Embedded | No | — |
| QR Code | Yes | Desktop QR code flow |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

### Test Credentials

| Test Value | Type | Notes |
|---|---|---|
| fake-venmo-account-nonce | Nonce | Sandbox test nonce for approved payment |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Venmo Event/Callback | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY (isBrowserSupported) | { isBrowserSupported } |
| PAYMENT_AUTHORIZED | AUTHORIZED (tokenize success) | { nonce, type, details: { username, externalId } } |
| PAYMENT_ERROR | ERROR (tokenize error) | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED (VENMO_CANCELED / VENMO_APP_CANCELED) | { reason } |

### Lifecycle Flow

```
1. loadSDK() → Import braintree-web/client + braintree-web/venmo modules
2. init(config, eventBus) → braintree.client.create({ authorization: clientToken })
   → braintree.venmo.create({ client, allowDesktop, paymentMethodUsage, ... })
   → venmoInstance.isBrowserSupported() → check device/browser support
   → Emits: PAYMENT_METHOD_READY
3. render(container) → Render branded "Venmo" button
4. authorize(paymentData) → venmoInstance.tokenize()
   → Mobile: Deep-link to Venmo app → user approves → redirect back
   → Desktop: QR code or popup flow → user scans/approves
   → Emits: PAYMENT_AUTHORIZED (with nonce, username)
5. getServerHandoff() → { endpoint: '/api/venmo/tokenize', method: 'POST', body: { nonce, amount, currency } }
6. teardown() → venmoInstance.teardown(), clear event bus
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | 10,000ms | 2 retries |
| Client create | 10,000ms | No retry |
| Venmo instance create | 10,000ms | No retry |
| Tokenize (user-driven) | 600,000ms (10 min) | No retry |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Venmo/Braintree Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| VENMO_NOT_ENABLED | VALIDATION_ERROR | No | Venmo not enabled for merchant |
| VENMO_CANCELED | USER_CANCELLED | No | User cancelled in Venmo app |
| VENMO_APP_CANCELED | USER_CANCELLED | No | User cancelled via app switch |
| VENMO_TOKENIZATION_ERROR | AUTH_FAILED | Yes | Tokenization failed |
| VENMO_NETWORK_ERROR | PROVIDER_ERROR | Yes (with delay) | Network issue |
| CLIENT_AUTHORIZATION_INVALID | PROVIDER_ERROR | No | Invalid Braintree credentials |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Tokenize/Transaction | /api/venmo/tokenize | POST | PASSTHROUGH |

### Key Request Fields (Tokenize)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount | PASSTHROUGH | Yes |
| amount.currency | currency | PASSTHROUGH | Yes |
| nonce | payment_method_nonce | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | order_id | PASSTHROUGH | No |
| customer.email | customer.email | PASSTHROUGH | No |
| customer.firstName | customer.first_name | PASSTHROUGH | No |
| customer.lastName | customer.last_name | PASSTHROUGH | No |

### Key Response Fields (Tokenize)

| APM Field | CH Field | Transform |
|---|---|---|
| transaction.id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| transaction.status | gatewayResponse.transactionState | MAP_ENUM |
| transaction.amount | paymentReceipt.approvedAmount.total | PASSTHROUGH |
| transaction.currency_iso_code | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| transaction.venmo_account.username | paymentReceipt.venmoUsername | PASSTHROUGH |
| transaction.venmo_account.venmo_user_id | paymentReceipt.venmoUserId | PASSTHROUGH |
