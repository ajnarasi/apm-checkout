# Afterpay BNPL -- Commerce Hub Field Mapping

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: v2
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12T05:30:00Z
patternTemplate: server-bnpl-v1
goldenMappingSource: "NONE -- generated from BNPL template + provider API docs"
safetyChecksPassed: true
confidence: generated
```

---

## Integration Pattern

| Property | Value |
|---|---|
| APM Provider | Afterpay |
| Pattern | Server-to-Server BNPL with Customer Redirect |
| Commerce Hub Endpoint | POST /checkouts/v1/orders |
| Capabilities | auth, capture, refund, void |
| Regions | US, AU |
| Channel | web |
| Auth Scheme | HTTP Basic (Base64-encoded username:password) |

---

## BNPL Template Differences: Afterpay vs. Klarna

This mapping was generated from the Klarna BNPL golden template with the following adaptations:

| Aspect | Klarna (Template) | Afterpay (Generated) |
|---|---|---|
| Amount format | Integer minor units (5000) | String decimal ("50.00") |
| Amount transform (request) | MULTIPLY_100 | NUMBER_TO_STRING |
| Amount transform (response) | DIVIDE_100 | STRING_TO_NUMBER |
| Checkout flow | Embedded JS SDK widget | Customer redirect to redirectCheckoutUrl |
| Customer object | shipping_address.given_name/family_name/email | consumer.givenNames/surname/email |
| Address fields | street_address/city/postal_code/country | line1/area1/region/postcode/countryCode |
| Line item price | Integer unit_price (2000) | Money object {amount: "20.00", currency: "USD"} |
| Return URLs | Not applicable (widget-based) | REQUIRED: redirectConfirmUrl + redirectCancelUrl |
| Auth model | Session create + widget + place order | Checkout create + redirect + auth/capture with token |

---

## Auth Capability -- Checkout Creation + Authorization

Afterpay authorization follows a three-phase pattern using customer redirect:

1. **Create checkout** -- server-to-server call returns `token` and `redirectCheckoutUrl`
2. **Customer authorizes** -- merchant redirects customer to `redirectCheckoutUrl`; customer approves on Afterpay page; Afterpay redirects back to `merchant.redirectConfirmUrl`
3. **Auth or capture** -- server-to-server call using `token` to authorize (deferred) or capture immediately

### Step 1: Checkout Creation

**Afterpay Endpoint**: `POST /v2/checkouts`

#### Request Mapping (Commerce Hub to Afterpay)

| CH Field Path | CH Type | Afterpay Field Path | Afterpay Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number (decimal) | amount.amount | string (decimal) | NUMBER_TO_STRING | 1 | CH 50.00 becomes Afterpay "50.00" |
| amount.currency | string | amount.currency | string | PASSTHROUGH | 1 | ISO-4217 (USD, AUD) |
| customer.firstName | string | consumer.givenNames | string | PASSTHROUGH | 1* | BNPL promoted |
| customer.lastName | string | consumer.surname | string | PASSTHROUGH | 1* | BNPL promoted |
| customer.email | string | consumer.email | string | PASSTHROUGH | 1* | BNPL promoted -- primary identity for Afterpay |
| customer.phone[0].phoneNumber | string | consumer.phoneNumber | string | PASSTHROUGH | 2 | |
| shippingAddress.firstName + shippingAddress.lastName | string | shipping.name | string | CONCAT | 1* | Concatenate with space separator |
| shippingAddress.address.street | string | shipping.line1 | string | PASSTHROUGH | 1* | |
| shippingAddress.address.houseNumberOrName | string | shipping.line2 | string | PASSTHROUGH | 2 | |
| shippingAddress.address.city | string | shipping.area1 | string | PASSTHROUGH | 1* | |
| shippingAddress.address.stateOrProvince | string | shipping.region | string | PASSTHROUGH | 1* | |
| shippingAddress.address.postalCode | string | shipping.postcode | string | PASSTHROUGH | 1* | |
| shippingAddress.address.country | string | shipping.countryCode | string | PASSTHROUGH | 1* | ISO 3166-1 alpha-2 |
| shippingAddress.phone | string | shipping.phoneNumber | string | PASSTHROUGH | 2 | |
| billingAddress.firstName + billingAddress.lastName | string | billing.name | string | CONCAT | 1* | |
| billingAddress.address.street | string | billing.line1 | string | PASSTHROUGH | 1* | |
| billingAddress.address.houseNumberOrName | string | billing.line2 | string | PASSTHROUGH | 2 | |
| billingAddress.address.city | string | billing.area1 | string | PASSTHROUGH | 1* | |
| billingAddress.address.stateOrProvince | string | billing.region | string | PASSTHROUGH | 1* | |
| billingAddress.address.postalCode | string | billing.postcode | string | PASSTHROUGH | 1* | |
| billingAddress.address.country | string | billing.countryCode | string | PASSTHROUGH | 1* | |
| billingAddress.phone | string | billing.phoneNumber | string | PASSTHROUGH | 2 | |
| orderData.itemDetails[].itemName | string | items[].name | string | PASSTHROUGH | 1* | BNPL promoted |
| orderData.itemDetails[].quantity | integer | items[].quantity | integer | PASSTHROUGH | 1* | BNPL promoted |
| orderData.itemDetails[].amountComponents.unitPrice | number | items[].price.amount | string | NUMBER_TO_STRING | 1* | CH 20.00 becomes "20.00" |
| amount.currency | string | items[].price.currency | string | PASSTHROUGH | 1* | Inherited from order currency |
| orderData.itemDetails[].productSKU | string | items[].sku | string | PASSTHROUGH | 2 | Max 128 characters |
| orderData.itemDetails[].itemUrl | string | items[].pageUrl | string | PASSTHROUGH | 2 | |
| orderData.itemDetails[].itemImageUrl | string | items[].imageUrl | string | PASSTHROUGH | 2 | |
| transactionDetails.merchantOrderId | string | merchantReference | string | PASSTHROUGH | 1 | Merchant order ID |
| checkoutInteractions.returnUrls.successUrl | string | merchant.redirectConfirmUrl | string | PASSTHROUGH | 1 | REQUIRED -- customer return on success |
| checkoutInteractions.returnUrls.cancelUrl | string | merchant.redirectCancelUrl | string | PASSTHROUGH | 1 | REQUIRED -- customer return on cancel |

> **Tier 1* (BNPL Promoted)**: These fields are Tier 2 or optional for card-based APMs but are promoted to Tier 1 for BNPL integrations. Afterpay rejects requests without consumer identity, addresses, and line items.

#### Response Mapping (Afterpay to Commerce Hub)

| Afterpay Field | Afterpay Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| token | string | paymentMethod.paymentToken.tokenData | string | PASSTHROUGH | 1 | Checkout token used for auth/capture |
| redirectCheckoutUrl | string | checkoutInteractions.actions.url | string | PASSTHROUGH | 1 | URL to redirect customer to Afterpay |
| expires | string | (unmappable -- log only) | -- | -- | -- | Checkout expiry timestamp |

---

### Step 2: Customer Authorization (Client-Side Redirect)

This step occurs on the client side. The merchant redirects the customer to the `redirectCheckoutUrl` returned in Step 1. The customer interacts with Afterpay's hosted checkout page to approve the payment. On approval, Afterpay redirects the customer back to `merchant.redirectConfirmUrl`. On cancellation, the customer is redirected to `merchant.redirectCancelUrl`.

No Commerce Hub or Afterpay server-to-server call is involved in this step.

---

### Step 3: Auth (Deferred Capture)

**Afterpay Endpoint**: `POST /v2/payments/auth`

#### Request Mapping (Commerce Hub to Afterpay)

| CH Field Path | CH Type | Afterpay Field Path | Afterpay Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| paymentMethod.paymentToken.tokenData | string | token | string | PASSTHROUGH | 1 | Checkout token from Step 1 |
| transactionDetails.merchantOrderId | string | merchantReference | string | PASSTHROUGH | 1 | |

#### Response Mapping (Afterpay to Commerce Hub)

| Afterpay Field | Afterpay Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| id | string | transactionProcessingDetails.transactionId | string | PASSTHROUGH | 1 | Afterpay Order ID, used for capture/refund/void |
| status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | APPROVED to AUTHORIZED, DECLINED to DECLINED |
| originalAmount.amount | string | paymentReceipt.approvedAmount.total | number | STRING_TO_NUMBER | 1 | "50.00" becomes 50.00 |
| originalAmount.currency | string | paymentReceipt.approvedAmount.currency | string | PASSTHROUGH | 1 | |
| paymentState | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | AUTH_APPROVED to AUTHORIZED, CAPTURED to CAPTURED, VOIDED to VOIDED |
| merchantReference | string | transactionDetails.merchantOrderId | string | PASSTHROUGH | 1 | |

#### Status Enum Mapping

| Afterpay status | CH transactionState |
|---|---|
| APPROVED | AUTHORIZED |
| DECLINED | DECLINED |

#### PaymentState Enum Mapping

| Afterpay paymentState | CH transactionState |
|---|---|
| AUTH_APPROVED | AUTHORIZED |
| PARTIALLY_CAPTURED | PARTIALLY_CAPTURED |
| CAPTURED | CAPTURED |
| VOIDED | VOIDED |

---

## Capture Capability

**Afterpay Endpoint**: `POST /v2/payments/{orderId}/capture`

Supports both full and partial capture. The `orderId` is the Afterpay Order ID from the auth response.

### Request Mapping (Commerce Hub to Afterpay)

| CH Field | CH Type | Afterpay Field | Afterpay Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number | amount.amount | string | NUMBER_TO_STRING | 1 | Capture amount |
| amount.currency | string | amount.currency | string | PASSTHROUGH | 1 | |

### Response Mapping (Afterpay to Commerce Hub)

| Afterpay Field | Afterpay Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| id | string | transactionProcessingDetails.transactionId | string | PASSTHROUGH | 1 | Afterpay Order ID |
| status | string | gatewayResponse.transactionState | string | MAP_ENUM | 1 | APPROVED to CAPTURED |
| originalAmount.amount | string | paymentReceipt.approvedAmount.total | number | STRING_TO_NUMBER | 1 | Original authorized amount |
| originalAmount.currency | string | paymentReceipt.approvedAmount.currency | string | PASSTHROUGH | 1 | |
| openToCaptureAmount.amount | string | (informational -- remaining capturable) | -- | -- | -- | Remaining amount for partial capture |

---

## Refund Capability

**Afterpay Endpoint**: `POST /v2/payments/{orderId}/refund`

Supports full and partial refund. The `orderId` is the Afterpay Order ID.

### Request Mapping (Commerce Hub to Afterpay)

| CH Field | CH Type | Afterpay Field | Afterpay Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| amount.total | number | amount.amount | string | NUMBER_TO_STRING | 1 | Refund amount |
| amount.currency | string | amount.currency | string | PASSTHROUGH | 1 | |
| transactionDetails.merchantOrderId | string | merchantReference | string | PASSTHROUGH | 2 | Max 85 characters |
| referenceTransactionDetails.referenceTransactionId | string | requestId | string | PASSTHROUGH | 1 | Idempotency key, max 64 characters |

### Response Mapping (Afterpay to Commerce Hub)

| Afterpay Field | Afterpay Type | CH Field | CH Type | Transform | Tier | Notes |
|---|---|---|---|---|---|---|
| refundId | string | paymentReceipt.processorResponseDetails.referenceNumber | string | PASSTHROUGH | 1 | Afterpay refund ID |
| amount.amount | string | paymentReceipt.refundedAmount.total | number | STRING_TO_NUMBER | 1 | "50.00" becomes 50.00 |
| amount.currency | string | paymentReceipt.refundedAmount.currency | string | PASSTHROUGH | 1 | |

---

## Void Capability

**Afterpay Endpoint**: `POST /v2/payments/{orderId}/void`

Voids an authorized but uncaptured order. No request body required. The `orderId` is passed as a path parameter from `referenceTransactionDetails.referenceTransactionId`.

### Request

No field mapping required. Empty request body. The `orderId` is passed as a URL path parameter.

### Response

| Afterpay Behavior | CH Field | CH Value | Notes |
|---|---|---|---|
| HTTP 200 with updated order | gatewayResponse.transactionState | VOIDED | State derived from response status |

---

## BNPL-Specific Constraints

1. **Line items are mandatory** -- `orderData.itemDetails[]` (mapped to `items[]`) is required. Afterpay rejects checkouts without line items.
2. **Consumer identity is required** -- `consumer.givenNames`, `consumer.surname`, and `consumer.email` are all mandatory. Mapped from CH customer fields.
3. **Address requirement** -- both shipping and billing addresses are required for Afterpay risk decisioning.
4. **Return URLs are mandatory** -- unlike Klarna (widget-based), Afterpay's redirect flow requires `merchant.redirectConfirmUrl` and `merchant.redirectCancelUrl`.
5. **String decimal amounts** -- all monetary amounts use NUMBER_TO_STRING on request and STRING_TO_NUMBER on response. No multiplication or division. This differs from Klarna's integer minor unit format.
6. **Item price as Money object** -- each item's price must include both `amount` (string decimal) and `currency` (string). This differs from Klarna's flat integer `unit_price`.
