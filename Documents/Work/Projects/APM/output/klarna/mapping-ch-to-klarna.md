# Klarna BNPL -- Commerce Hub Field Mapping

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: v1
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12
patternTemplate: server-bnpl-v1
goldenMappingSource: sandbox-validated-mapping
safetyChecksPassed: true
```

---

## Integration Pattern

| Property | Value |
|---|---|
| APM Provider | Klarna |
| Pattern | Server-to-Server BNPL |
| Commerce Hub Endpoint | POST /checkouts/v1/orders |
| Capabilities | auth, capture, partial-refund, cancel |
| Regions | US, UK, DE, FR |
| Channel | web |
| Auth Scheme | HTTP Basic (Base64-encoded username:password) |

---

## Auth Capability -- Session Creation (Two-Step Flow)

Klarna authorization follows a three-phase pattern that differs from standard redirect APMs:

1. **Create payment session** -- server-to-server call returns `client_token` and `session_id`
2. **Customer authorizes** -- merchant initializes the Klarna JS SDK with `client_token`; customer completes approval in the embedded widget, which returns `auth_token`
3. **Place order** -- server-to-server call using `auth_token` to finalize the authorized order

### Step 1: Session Creation

**Klarna Endpoint**: `POST /payments/v1/sessions`

#### Request Mapping (Commerce Hub to Klarna)

| CH Field Path | CH Type | Klarna Field Path | Klarna Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number (decimal) | order_amount | integer (minor units) | MULTIPLY_100 | 1 | CH 50.00 becomes Klarna 5000 |
| amount.currency | string | purchase_currency | string | PASSTHROUGH | 1 | ISO-4217 |
| customerAddress.country | string | purchase_country | string | PASSTHROUGH | 1 | ISO-3166; determines available Klarna products |
| transactionDetails.merchantOrderId | string | merchant_reference1 | string | PASSTHROUGH | 1 | Merchant order reference |
| transactionDetails.merchantTransactionId | string | merchant_reference2 | string | PASSTHROUGH | 2 | Secondary reference |
| amountComponents.taxAmounts[0].taxAmount | number | order_tax_amount | integer | MULTIPLY_100 | 1 | Total order tax |
| orderData.itemDetails[].itemName | string | order_lines[].name | string | PASSTHROUGH | 1* | BNPL promoted |
| orderData.itemDetails[].quantity | number | order_lines[].quantity | integer | PASSTHROUGH | 1* | BNPL promoted |
| orderData.itemDetails[].amountComponents.unitPrice | number | order_lines[].unit_price | integer | MULTIPLY_100 | 1* | BNPL promoted |
| orderData.itemDetails[].grossAmount | number | order_lines[].total_amount | integer | MULTIPLY_100 | 1* | BNPL promoted |
| orderData.itemDetails[].taxAmounts[0].taxAmount | number | order_lines[].total_tax_amount | integer | MULTIPLY_100 | 1* | BNPL promoted |
| orderData.itemDetails[].amountComponents.priceAdjustments[0].adjustmentAmount | number | order_lines[].total_discount_amount | integer | MULTIPLY_100 | 2 | Line-level discount |
| shippingAddress.firstName | string | shipping_address.given_name | string | PASSTHROUGH | 1* | BNPL promoted |
| shippingAddress.lastName | string | shipping_address.family_name | string | PASSTHROUGH | 1* | BNPL promoted |
| shippingAddress.address.street | string | shipping_address.street_address | string | PASSTHROUGH | 1* | |
| shippingAddress.address.city | string | shipping_address.city | string | PASSTHROUGH | 1* | |
| shippingAddress.address.postalCode | string | shipping_address.postal_code | string | PASSTHROUGH | 1* | |
| shippingAddress.address.country | string | shipping_address.country | string | PASSTHROUGH | 1* | |
| customer.email | string | shipping_address.email | string | PASSTHROUGH | 1* | BNPL promoted -- email is the customer identity for Klarna |
| customer.phone[0].phoneNumber | string | shipping_address.phone | string | PASSTHROUGH | 2 | |
| billingAddress.firstName | string | billing_address.given_name | string | PASSTHROUGH | 1* | |
| billingAddress.lastName | string | billing_address.family_name | string | PASSTHROUGH | 1* | |
| billingAddress.address.street | string | billing_address.street_address | string | PASSTHROUGH | 1* | |
| billingAddress.address.city | string | billing_address.city | string | PASSTHROUGH | 1* | |
| billingAddress.address.postalCode | string | billing_address.postal_code | string | PASSTHROUGH | 1* | |
| billingAddress.address.country | string | billing_address.country | string | PASSTHROUGH | 1* | |

> **Tier 1* (BNPL Promoted)**: These fields are Tier 2 or optional for card-based APMs but are promoted to Tier 1 for BNPL integrations. Klarna rejects requests without line items, addresses, and customer email in production.

#### Response Mapping (Klarna to Commerce Hub)

| Klarna Field | Klarna Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| session_id | string | order.providerOrderId | string | PASSTHROUGH | 1 | Klarna session identifier |
| client_token | string | paymentMethod.paymentToken.tokenData | string | PASSTHROUGH | 1 | Used to initialize the Klarna JS SDK |
| payment_method_categories[].identifier | string | paymentMethod.type | string | PASSTHROUGH | 2 | Available Klarna products (pay_later, pay_over_time) |

---

### Step 2: Customer Authorization (Client-Side)

This step occurs entirely on the client side. The merchant initializes the Klarna JS SDK using the `client_token` returned in Step 1. The customer interacts with the Klarna widget to approve the payment. On approval, the widget returns an `auth_token` that the merchant passes to Step 3.

No Commerce Hub or Klarna server-to-server call is involved in this step.

---

### Step 3: Place Order

**Klarna Endpoint**: `POST /payments/v1/authorizations/{auth_token}/order`

The request body mirrors the session creation request (same field mapping as Step 1).

#### Response Mapping (Klarna to Commerce Hub)

| Klarna Field | Klarna Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| order_id | string | transactionProcessingDetails.transactionId | string | PASSTHROUGH | 1 | Used for all subsequent operations (capture, refund, cancel) |
| fraud_status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | ACCEPTED to AUTHORIZED, PENDING to PENDING, REJECTED to DECLINED |
| authorized_payment_method.type | string | paymentMethod.type | string | PASSTHROUGH | 2 | pay_later, pay_over_time, etc. |

#### Fraud Status Enum Mapping

| Klarna fraud_status | CH transactionState |
|---|---|
| ACCEPTED | AUTHORIZED |
| PENDING | PENDING |
| REJECTED | DECLINED |

---

## Capture Capability

**Klarna Endpoint**: `POST /ordermanagement/v1/orders/{order_id}/captures`

Supports both full and partial capture. For partial capture, include only the subset of `order_lines` being captured.

### Request Mapping (Commerce Hub to Klarna)

| CH Field | CH Type | Klarna Field | Klarna Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number | captured_amount | integer | MULTIPLY_100 | 1 | Capture amount in minor units |
| transactionDetails.merchantOrderId | string | reference | string | PASSTHROUGH | 2 | Capture reference |
| orderData.itemDetails[] | array | order_lines[] | array | SAME_FORMAT | 1* | Subset of original items for partial capture |

### Response Mapping (Klarna to Commerce Hub)

| Klarna Field | Klarna Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| capture_id | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | Capture reference ID |
| captured_amount | integer | paymentReceipt.approvedAmount.total | number | DIVIDE_100 | 1 | Klarna 5000 becomes CH 50.00 |

---

## Partial Refund Capability

**Klarna Endpoint**: `POST /ordermanagement/v1/orders/{order_id}/refunds`

Supports partial amounts. The `order_lines` array is optional but recommended when refunding specific items.

### Request Mapping (Commerce Hub to Klarna)

| CH Field | CH Type | Klarna Field | Klarna Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number | refunded_amount | integer | MULTIPLY_100 | 1 | Refund amount (partial amounts accepted) |
| transactionDetails.merchantOrderId | string | reference | string | PASSTHROUGH | 2 | Refund reference |
| orderData.itemDetails[] | array | order_lines[] | array | SAME_FORMAT | 2 | Specific items being refunded |

### Response Mapping (Klarna to Commerce Hub)

| Klarna Field | Klarna Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| refund_id | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | Refund reference ID |
| refunded_amount | integer | paymentReceipt.approvedAmount.total | number | DIVIDE_100 | 1 | Klarna 5000 becomes CH 50.00 |

---

## Cancel Capability

**Klarna Endpoint**: `POST /ordermanagement/v1/orders/{order_id}/cancel`

Cancels an authorized but uncaptured order. No request body required.

### Request

No field mapping required. The `order_id` is passed as a path parameter.

### Response

| Klarna Behavior | CH Field | CH Value | Notes |
|---|---|---|---|
| HTTP 204 No Content | gatewayResponse.transactionState | VOIDED | Empty response body; state derived from HTTP status |

---

## BNPL-Specific Constraints

1. **Line items are mandatory** -- `orderData.itemDetails[]` (mapped to `order_lines[]`) is required. Klarna rejects requests without line items in production.
2. **Amount integrity** -- the sum of all `order_lines[].total_amount` values must equal `order_amount`. Klarna validates this server-side.
3. **Address requirement** -- both shipping and billing addresses are required for Klarna risk decisioning.
4. **Customer email is identity** -- `customer.email` is the primary customer identifier for Klarna. It is required for all BNPL transactions.
5. **Minor-unit conversion** -- all monetary amounts use MULTIPLY_100 on request and DIVIDE_100 on response. No exceptions.
