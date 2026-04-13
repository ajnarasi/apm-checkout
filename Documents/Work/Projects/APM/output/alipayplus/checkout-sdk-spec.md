# Alipay+ — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | ALIPAYPLUS |
| **Display Name** | Alipay+ |
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
| **Auth Scheme** | RSA256 (signed request body) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| PH | PHP | GCash, Maya |
| SG | SGD | Alipay+, GrabPay |
| MY | MYR | Touch 'n Go, Boost |
| TH | THB | TrueMoney |
| KR | KRW | KakaoPay |
| ID | IDR | DANA, OVO |
| HK | HKD | AlipayHK |
| JP | JPY | PayPay |
| CN | CNY | Alipay (mainland) |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | DECIMAL_TO_STRING_CENTS |
| **Example** | 49.99 → "4999" |
| **Type** | String (minor units as string) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **Button Label** | "Pay with Alipay+" | "Pay with Alipay+" |
| **Brand Color** | #1677FF (Alipay Blue) | #1677FF |
| **Logo URL** | /logos/alipayplus.svg | — |
| **QR Container** | Custom container element | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Client ID | Credential vault | Alipay+ merchant portal |
| RSA Private Key | Credential vault | For request signing |
| Alipay+ Public Key | Configuration | For response verification |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Redirect | Yes | Mobile wallet redirect |
| Widget/Embedded | No | — |
| QR Code | Yes | Primary desktop flow |
| Payment Sheet | No | — |
| Voucher/Reference | No | — |

## Section C: Lifecycle & Callback Mapping

### Universal Event Mapping

| Universal Event | Alipay+ Event | Data Payload |
|---|---|---|
| PAYMENT_METHOD_READY | READY | { paymentId, qrCodeUrl } |
| PAYMENT_AUTHORIZED | AUTHORIZED | { paymentId, resultCode, amount } |
| PAYMENT_ERROR | ERROR | { code, message, retryable } |
| PAYMENT_CANCELLED | CANCELLED | { paymentId, reason } |
| REDIRECT_REQUIRED | REDIRECT | { normalUrl, schemeUrl, applinkUrl } |
| QR_CODE_GENERATED | QR | { qrCodeUrl, expiresAt } |

### Lifecycle Flow

```
1. loadSDK() → No-op (server-side QR generation)
2. init(config, eventBus) → Store config and event bus reference
3. render(container) → Render branded "Alipay+" button
4. authorize(paymentData) → POST /api/alipayplus/pay → receive QR code URL
   → Emits: PAYMENT_METHOD_READY
   → Desktop: Render QR code in container → Emits: QR_CODE_GENERATED
   → Mobile: Redirect to wallet app → Emits: REDIRECT_REQUIRED
5. poll(paymentId) → GET /api/alipayplus/inquiry/:id (every 3s, max 5 min)
   → On SUCCESS: Emits PAYMENT_AUTHORIZED
   → On FAIL: Emits PAYMENT_ERROR
   → On CANCEL: Emits PAYMENT_CANCELLED
6. getServerHandoff() → { endpoint: '/api/alipayplus/pay', method: 'POST', body: { amount, currency, region } }
7. teardown() → Remove QR, clear event bus, stop polling
```

### Timeout Budgets

| Operation | Timeout | Retry Policy |
|---|---|---|
| Script loading | N/A | N/A (no SDK) |
| SDK init | 5,000ms | No retry |
| Pay (server call) | 30,000ms | No retry |
| QR polling | 300,000ms (5 min) | 3s interval, stop on terminal state |
| Server handoff | 15,000ms | 3 attempts, exponential backoff |

### Error Code Mapping

| Alipay+ Error | Universal Error Code | Retryable | Notes |
|---|---|---|---|
| INVALID_API_CALL | VALIDATION_ERROR | Yes | Malformed request |
| ORDER_NOT_EXIST | VALIDATION_ERROR | No | Payment ID not found |
| USER_PAYING | PENDING | Yes | User still in wallet flow |
| PAYMENT_IN_PROCESS | PENDING | Yes | Continue polling |
| RISK_REJECT | AUTH_FAILED | No | Risk control declined |
| SYSTEM_ERROR | PROVIDER_ERROR | Yes (with delay) | Alipay+ internal error |

## Section D: Server-Side Handoff

### Endpoints

| Capability | CH Endpoint | HTTP Method | Amount Transform |
|---|---|---|---|
| Pay (Create) | /api/alipayplus/pay | POST | DECIMAL_TO_STRING_CENTS |
| Inquiry | /api/alipayplus/inquiry/:id | GET | — |
| Refund | /api/alipayplus/refund | POST | DECIMAL_TO_STRING_CENTS |

### Key Request Fields (Pay)

| CH Field | APM Field | Transform | Required |
|---|---|---|---|
| amount.total | paymentAmount.value | DECIMAL_TO_STRING_CENTS | Yes |
| amount.currency | paymentAmount.currency | PASSTHROUGH | Yes |
| transactionDetails.merchantOrderId | paymentRequestId | PASSTHROUGH | Yes |
| customerAddress.country | envInfo.terminalType | MAP_REGION | Yes |
| checkoutInteractions.returnUrls.successUrl | paymentRedirectUrl | PASSTHROUGH | Yes |
| orderItems | order.goods[] | MAP_LINE_ITEMS | No |

### Key Response Fields (Pay)

| APM Field | CH Field | Transform |
|---|---|---|
| paymentId | transactionProcessingDetails.transactionId | PASSTHROUGH |
| resultCode | gatewayResponse.transactionState | MAP_ENUM |
| normalUrl | checkoutInteractions.actions.url | PASSTHROUGH |
| codeValue | checkoutInteractions.actions.qrCodeUrl | PASSTHROUGH |
| paymentAmount.value | paymentReceipt.approvedAmount.total | REVERSE_DECIMAL_STRING |
| paymentAmount.currency | paymentReceipt.approvedAmount.currency | PASSTHROUGH |
