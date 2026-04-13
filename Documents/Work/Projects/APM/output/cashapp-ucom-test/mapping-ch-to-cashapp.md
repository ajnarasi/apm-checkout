# CashApp Field Mapping: Commerce Hub to CashApp

> **Pattern**: Redirect Wallet v1
> **Commerce Hub API**: POST /checkouts/v1/orders (v1.26.0302)
> **CashApp Provider API Version**: v2
> **Ucom Version**: 0.2.3
> **Generated**: 2026-04-11
> **Template**: redirect-wallet-v1
> **Golden Mapping Source**: tech-lead-manual-mapping + sandbox-validated
> **Safety Checks Passed**: true
> **Platform Filter**: `--platform ucom`

---

## Auth Capability

The Auth capability spans two CashApp API calls:

1. **Customer Request Creation** -- Creates a payment request and returns a redirect URL (or QR code) for customer approval.
2. **Payment** -- Executes the payment after the customer approves.

### Request Mapping (Commerce Hub to CashApp)

| CH Field Path | CH Type | CashApp Field Path | CashApp Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `amount.total` | number | `request.actions[0].amount` | integer | MULTIPLY_100 | 1 | CH decimal 15.10 becomes CashApp cents 1510 |
| `amount.currency` | string | `request.actions[0].currency` | string | PASSTHROUGH | 1 | ISO-4217. Must not be modified. |
| `transactionDetails.operationType` | string | `payment.capture` | boolean | MAP_ENUM | 1 | CAPTURE maps to `true`, AUTHORIZE maps to `false` |
| `paymentMethod.paymentToken.tokenData` | string | `payment.grant_id` | string | PASSTHROUGH | 2 | Grant ID returned from Customer Request. Max 256 characters. |
| `merchantDetails.processorMerchantId` | string | `request.actions[0].scope_id` | string | LOOKUP | 2 | Conditional on payment type. ONE_TIME uses boarding merchantId; ON_FILE uses boarding brandId. See Conditional Routing section. |
| `transactionProcessingDetails.transactionId` | string | `request.reference_id` | string | PASSTHROUGH | 1 | Transaction reference identifier |
| `transactionProcessingDetails.transactionId` | string | `idempotency_key` | string | PASSTHROUGH | 2 | Idempotency key. Same value as `reference_id`. |
| `checkoutInteractions.returnUrls.successUrl` | string | `request.redirect_url` | string | PASSTHROUGH | 1 | Redirect destination after customer approves |
| `checkoutInteractions.channel` | string | `request.channel` | string | MAP_ENUM | 1 | WEB maps to ONLINE, IN_APP maps to IN_APP |
| `merchantDetails.ProcessorMerchantKey` | string | `[header] apiKey` | string | AUTH_INJECT | 2 | Used for HMAC signature creation |
| `merchantDetails.ProcessorMerchantSecret` | string | `[header] secret` | string | AUTH_INJECT | 2 | Used for HMAC signature creation |

### Response Mapping (CashApp to Commerce Hub)

| CashApp Field Path | CashApp Type | CH Field Path | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `request.id` | string | `order.providerOrderId` | string | PASSTHROUGH | 1 | Prefixed with GRR_. Customer Request ID. |
| `request.status` | string | `order.orderStatus` | string | MAP_ENUM | 1 | PENDING maps to PAYER_ACTION_REQUIRED, APPROVED maps to AUTHORIZED, DECLINED maps to DECLINED |
| `payment.id` | string | `paymentReceipt.processorResponseDetails.referenceNumber` | string | PASSTHROUGH | 1 | Prefixed with PWC_. Payment ID. |
| `payment.amount` | integer | `paymentReceipt.approvedAmount.total` | number | DIVIDE_100 | 1 | CashApp cents 1510 becomes CH decimal 15.10 |
| `grant_id` | string | `paymentMethod.paymentSource.paymentToken.tokenData` | string | PASSTHROUGH | 2 | Prefixed with GRG_. |
| `request.auth_flow_triggers.desktop_url` | string | `checkoutInteractions.actions.url` | string | CUSTOM | 2 | Select `desktop_url` or `mobile_url` based on device context |
| `request.auth_flow_triggers.qr_code_image_url` | string | `checkoutInteractions.actions.code` | string | PASSTHROUGH | 2 | QR code URL for scan-to-pay flow |
| `request.channel` | string | `checkoutInteractions.channel` | string | MAP_ENUM | 2 | ONLINE maps to WEB, IN_APP maps to WEB |
| `request.created_at` | string | `transactionProcessingDetails.transactionTimestamp` | string | PASSTHROUGH | 2 | ISO 8601 timestamp |
| `requester_profile.name` | string | `dynamicDescriptors.merchantName` | string | PASSTHROUGH | 2 | Merchant display name shown to customer |

---

## Capture Capability

Capture uses the same field mapping as Auth. The only difference is that `transactionDetails.operationType` is set to `CAPTURE`, which maps `payment.capture` to `true`.

All request and response fields, transforms, and tiers are identical to the Auth capability tables above.

---

## Refund Capability

### Request Mapping (Commerce Hub to CashApp)

| CH Field Path | CH Type | CashApp Field Path | CashApp Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `amount.total` | number | `refund.amount` | integer | MULTIPLY_100 | 1 | Refund amount in cents |
| `amount.currency` | string | `refund.currency` | string | PASSTHROUGH | 1 | Must match original transaction currency |
| `referenceTransactionDetails.referenceTransactionId` | string | `refund.payment_id` | string | PASSTHROUGH | 1 | Original PWC_ payment ID from the auth/capture response |
| `transactionProcessingDetails.transactionId` | string | `refund.reference_id` | string | PASSTHROUGH | 1 | Refund transaction reference |

### Response Mapping (CashApp to Commerce Hub)

| CashApp Field Path | CashApp Type | CH Field Path | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `refund.id` | string | `paymentReceipt.processorResponseDetails.referenceNumber` | string | PASSTHROUGH | 1 | Prefixed with PWCR_. Refund ID. |
| `refund.amount` | integer | `paymentReceipt.approvedAmount.total` | number | DIVIDE_100 | 1 | Refunded amount converted back to decimal |

---

## Conditional Routing

CashApp requires different `scope_id` values depending on the payment type. The connector must implement **SCOPE_TYPE_ROUTE** logic:

### ONE_TIME_PAYMENT

| Parameter | Value | Source |
|---|---|---|
| `scope_id` | `boarding_config.cashapp.merchantId` | Merchant boarding configuration |
| `amount` | **REQUIRED** | Must be present in `request.actions[0].amount` |
| `account_ref_id` | Not used | Omit from request |

### ON_FILE_PAYMENT

| Parameter | Value | Source |
|---|---|---|
| `scope_id` | `boarding_config.cashapp.brandId` | Brand boarding configuration |
| `amount` | **SUPPRESSED** | Must not be included in the Customer Request |
| `account_ref_id` | **REQUIRED** | Must be populated from boarding config or prior grant |

The routing decision is determined by the `payment_type` field in the merchant boarding configuration. The connector evaluates this before constructing the Customer Request payload.

---

## Auth Scheme

CashApp uses a two-tier authentication model:

### Customer Request Endpoint

- **Scheme**: `API_KEY` only
- **Header**: `Authorization: Client {CLIENT_ID}`
- No HMAC signature required for Customer Request creation.

### Payment Endpoint

- **Scheme**: `API_KEY` + `HMAC_SIGNATURE`
- The HMAC signature is constructed from the `apiKey` and `secret` values sourced from `merchantDetails.ProcessorMerchantKey` and `merchantDetails.ProcessorMerchantSecret`.
- The signature covers the request body and is transmitted in the `X-Signature` header.

### Extension Point

- **Handler**: `cashapp-signature-handler`
- **Scope**: `AUTH_HEADER_ONLY`
- This extension point allows custom signature logic without modifying the core connector. It intercepts the outbound request, computes the HMAC, and injects the authorization headers before transmission.
