# WeChat Pay — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | WECHATPAY |
| **Display Name** | WeChat Pay |
| **Pattern** | qr-code |
| **SDK CDN URL** | N/A — server-side QR generation |
| **NPM Package** | N/A |
| **SDK Version** | N/A |
| **Script Loading** | none |
| **Global Variable** | N/A |
| **CSP script-src** | N/A |
| **CSP connect-src** | Internal API only |
| **Sandbox URL** | N/A (mock environment) |
| **Sandbox Type** | Mock |
| **Auth Scheme** | HMAC-SHA256 (signed request body) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| CN | CNY | Primary market (mainland China) |
| HK | HKD | Cross-border |
| US | USD | Cross-border |
| GB | GBP | Cross-border |
| JP | JPY | Cross-border |
| AU | AUD | Cross-border |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | 49.99 → 4999 |
| **Type** | Integer (minor units — fen) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with WeChat Pay" | "Pay with WeChat Pay" |
| **Brand Color** | #07C160 (WeChat Green) | #07C160 |
| **Logo URL** | /logos/wechatpay.svg | — |
| **QR Container** | Custom container element | — |
| **QR Format** | URL string (render via qrcode.js or similar) | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Merchant ID (mch_id) | Credential vault | WeChat Pay merchant portal |
| API Key (v3) | Credential vault | For HMAC-SHA256 signing |
| App ID | Configuration | WeChat app identifier |
| Certificate Serial | Configuration | For API v3 auth |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | No | — |
| Widget/Embedded | No | — |
| QR Code | Yes | Primary flow — NATIVE trade type |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | WeChat Pay Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { prepayId, codeUrl } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { transactionId, tradeState, amount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| QR_CODE_GENERATED | QR | { codeUrl, expiresAt } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side QR generation)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "WeChat Pay" button
4. authorize(paymentData) → POST /api/wechatpay/order → receive code_url (QR string)
   → Emits: PAYMENT_METHOD_READY
   → Render QR code from code_url in container (using qrcode.js)
   → Emits: QR_CODE_GENERATED
5. poll(orderId) → GET /api/wechatpay/query/:id (every 3s, max 5 min)
   → On SUCCESS: Emits PAYMENT_AUTHORIZED
   → On FAIL: Emits PAYMENT_ERROR
6. getServerHandoff() → { endpoint: '/api/wechatpay/order', method: 'POST', body: { amount, currency, description } }
7. teardown() → Remove QR, clear event bus, stop polling
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Order create (server call) | 30,000ms | No retry |
| QR polling | 300,000ms (5 min) | 3s interval, stop on terminal state |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| WeChat Pay Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| PARAM_ERROR | VALIDATION_ERROR | Yes | Invalid request parameters |
| ORDERPAID | VALIDATION_ERROR | No | Order already paid |
| NOTENOUGH | AUTH_FAILED | No | Insufficient user balance |
| ORDERCLOSED | VALIDATION_ERROR | No | Order expired or closed |
| SYSTEMERROR | PROVIDER_ERROR | Yes (with delay) | WeChat Pay internal error |
| SIGN_ERROR | PROVIDER_ERROR | No | Signature verification failed |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Order Create | /api/wechatpay/order | POST | MULTIPLY_100 |
| Query | /api/wechatpay/query/:id | GET | — |
| Refund | /api/wechatpay/refund | POST | MULTIPLY_100 |

### Key Request Fields (Order Create)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | amount.total | MULTIPLY_100 | Yes |
| amount.currency | amount.currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | out_trade_no | PASSTHROUGH | Yes |
| transactionDetails.description | description | PASSTHROUGH | Yes |
| checkoutInteractions.returnUrls.webhookUrl | notify_url | PASSTHROUGH | Yes |
| tradeType | trade_type | HARDCODE("NATIVE") | Yes |

### Key Response Fields (Order Create)

| APM Field | CH Field | Transform |
|---|---|---|
| prepay_id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| code_url | checkoutInteractions.actions.qrCodeUrl | PASSTHROUGH |

### Key Response Fields (Query)

| APM Field | CH Field | Transform |
|---|---|---|
| transaction_id | transactionProcessingDetails.transactionId | PASSTHROUGH |
| trade_state | gatewayResponse.transactionState | MAP_ENUM |
| amount.total | paymentReceipt.approvedAmount.total | DIVIDE_100 |
| amount.currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
| payer.openid | paymentReceipt.payerIdentifier | PASSTHROUGH |
