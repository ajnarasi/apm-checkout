# Commerce Hub to Alipay+ Field Mapping

> Generated: 2026-04-12 | Provider: Alipay+ v1 (Direct) | Pattern: qr-code | Confidence: verified

---

## Auth Capability (consultPayment + pay)

### Step 1: consultPayment — Request (CH to Alipay+)

| CH Field Path | CH Type | Alipay+ Field Path | A+ Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `amount.total` | number | `paymentAmount.value` | string | DECIMAL_TO_STRING_CENTS | 1 | 500.00 to "50000" |
| `amount.currency` | string | `paymentAmount.currency` | string | PASSTHROUGH | 1 | ISO 4217 |
| `checkoutInteractions.channel` | string | `env.terminalType` | string | MAP_ENUM | 1 | WEB to WEB, IN_APP to APP |
| `customerAddress.country` | string | `userRegion` | string | PASSTHROUGH | 2 | ISO 3166 2-letter |

### Step 1: consultPayment — Response (Alipay+ to CH)

| Alipay+ Field | A+ Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `result.resultStatus` | string | `gatewayResponse.transactionState` | string | MAP_ENUM | 1 | S to SUCCESS |
| `paymentOptions[].paymentMethodType` | string | `paymentMethod.type` | string | PASSTHROUGH | 2 | Available wallets |

### Step 2: pay — Request (CH to Alipay+)

| CH Field Path | CH Type | Alipay+ Field Path | A+ Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `amount.total` | number | `paymentAmount.value` | string | DECIMAL_TO_STRING_CENTS | 1 | 500.00 to "50000" |
| `amount.currency` | string | `paymentAmount.currency` | string | PASSTHROUGH | 1 | |
| `transactionDetails.merchantOrderId` | string | `paymentRequestId` | string | PASSTHROUGH | 1 | Idempotency key |
| `merchantDetails.merchantId` | string | `order.merchant.referenceMerchantId` | string | PASSTHROUGH | 1 | |
| `merchantDetails.dbaName` | string | `order.merchant.merchantName` | string | PASSTHROUGH | 2 | |
| `dynamicDescriptors.mcc` | string | `order.merchant.merchantMCC` | string | PASSTHROUGH | 2 | |
| `orderData.orderDescription` | string | `order.orderDescription` | string | PASSTHROUGH | 2 | |
| `orderData.itemDetails[].itemName` | string | `order.goods[].goodsName` | string | PASSTHROUGH | 2 | |
| `orderData.itemDetails[].quantity` | number | `order.goods[].goodsQuantity` | string | NUMBER_TO_STRING | 2 | |
| `orderData.itemDetails[].amountComponents.unitPrice` | number | `order.goods[].goodsUnitAmount.value` | string | DECIMAL_TO_STRING_CENTS | 2 | |
| `customer.merchantCustomerId` | string | `order.buyer.referenceBuyerId` | string | PASSTHROUGH | 2 | |
| `paymentMethod.provider` | string | `paymentMethod.paymentMethodType` | string | MAP_ENUM | 1 | ALIPAYPLUS to CONNECT_WALLET |
| `checkoutInteractions.channel` | string | `order.env.terminalType` | string | MAP_ENUM | 1 | WEB to WEB |
| `checkoutInteractions.returnUrls.successUrl` | string | `paymentRedirectUrl` | string | PASSTHROUGH | 1 | |

### Step 2: pay — Response (Alipay+ to CH)

| Alipay+ Field | A+ Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `paymentId` | string | `transactionProcessingDetails.transactionId` | string | PASSTHROUGH | 1 | Alipay+ payment ID |
| `result.resultStatus` | string | `gatewayResponse.transactionState` | string | MAP_ENUM | 1 | S to AUTHORIZED, U to PENDING, F to DECLINED |
| `paymentAmount.value` | string | `paymentReceipt.approvedAmount.total` | number | STRING_CENTS_TO_DECIMAL | 1 | "50000" to 500.00 |
| `paymentAmount.currency` | string | `paymentReceipt.approvedAmount.currency` | string | PASSTHROUGH | 1 | |
| `normalUrl` | string | `checkoutInteractions.actions.url` | string | PASSTHROUGH | 1 | Redirect for wallet selection |
| `paymentData` | string | `paymentMethod.paymentToken.tokenData` | string | PASSTHROUGH | 2 | SDK data for APP |
| `pspId` | string | `paymentMethod.type` | string | PASSTHROUGH | 2 | Wallet provider ID |
| `acquirerId` | string | `paymentReceipt.processorResponseDetails.referenceNumber` | string | PASSTHROUGH | 2 | |

---

## Refund Capability

**Alipay+ Endpoint**: POST /aps/api/v1/payments/refund

### Request (CH to Alipay+)

| CH Field Path | CH Type | Alipay+ Field Path | A+ Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| `referenceTransactionDetails.referenceTransactionId` | string | `paymentId` | string | PASSTHROUGH | 1 | Original payment ID |
| `transactionDetails.merchantOrderId` | string | `refundRequestId` | string | PASSTHROUGH | 1 | Idempotency |
| `amount.total` | number | `refundAmount.value` | string | DECIMAL_TO_STRING_CENTS | 1 | Partial or full |
| `amount.currency` | string | `refundAmount.currency` | string | PASSTHROUGH | 1 | |
| `transactionDetails.paymentDescription` | string | `refundReason` | string | PASSTHROUGH | 2 | |

### Response (Alipay+ to CH)

| Alipay+ Field | A+ Type | CH Field | CH Type | Transform | Tier |
|---|---|---|---|---|---|
| `result.resultStatus` | string | `gatewayResponse.transactionState` | string | MAP_ENUM | 1 |
| `refundId` | string | `paymentReceipt.processorResponseDetails.referenceNumber` | string | PASSTHROUGH | 1 |
| `refundAmount.value` | string | `paymentReceipt.approvedAmount.total` | number | STRING_CENTS_TO_DECIMAL | 1 |
| `refundTime` | string | `transactionProcessingDetails.transactionTimestamp` | string | PASSTHROUGH | 2 |

---

## Partial Refund Capability

Same as Refund — use partial amount in `refundAmount.value`. Multiple partial refunds allowed until total refunded equals payment amount.

---

## Cancel Capability

**Alipay+ Endpoint**: POST /aps/api/v1/payments/cancelPayment

### Request (CH to Alipay+)

| CH Field Path | CH Type | Alipay+ Field Path | A+ Type | Transform | Tier |
|---|---|---|---|---|---|
| `referenceTransactionDetails.referenceTransactionId` | string | `paymentId` | string | PASSTHROUGH | 1 |
| `transactionDetails.merchantOrderId` | string | `paymentRequestId` | string | PASSTHROUGH | 1 |

### Response

| Alipay+ Field | CH Field | Transform | Tier |
|---|---|---|---|
| `result.resultStatus` | `gatewayResponse.transactionState` | MAP_ENUM: S to VOIDED | 1 |

---

## Inquiry Capability

**Alipay+ Endpoint**: POST /aps/api/v1/payments/inquiryPayment

### Request

| CH Field | Alipay+ Field | Transform | Tier |
|---|---|---|---|
| `transactionDetails.merchantOrderId` | `paymentRequestId` | PASSTHROUGH | 1 |

### Response

| Alipay+ Field | CH Field | Transform | Tier |
|---|---|---|---|
| `paymentId` | `transactionProcessingDetails.transactionId` | PASSTHROUGH | 1 |
| `paymentStatus` | `gatewayResponse.transactionState` | MAP_ENUM: SUCCESS to CAPTURED, FAIL to DECLINED, PROCESSING to PENDING | 1 |
| `paymentAmount.value` | `paymentReceipt.approvedAmount.total` | STRING_CENTS_TO_DECIMAL | 1 |
| `paymentTime` | `transactionProcessingDetails.transactionTimestamp` | PASSTHROUGH | 2 |

---

## Auth Scheme

```yaml
type: RSA256_SIGNATURE
headers:
  client-id: Alipay+ assigned client ID
  request-time: ISO 8601 timestamp
  signature: RSA256 signed request body
note: Unlike HTTP Basic (Klarna) or Bearer (PPRO), Alipay+ uses RSA key-pair signature.
extensionPoint:
  handler: alipayplus-rsa-signer
  scope: AUTH_HEADER_ONLY
```
