# Ucom - Commerce Hub Adapter Specification for Afterpay BNPL

> Generated: 2026-04-12T05:30:00Z | Pattern: server-bnpl-v1 | Commerce Hub: 1.26.0302 | Ucom: 0.2.3 | Confidence: generated

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| Afterpay Provider API | v2 |
| Ucom | 0.2.3 |
| Pattern Template | server-bnpl-v1 |
| Golden Mapping Source | NONE -- generated from BNPL template + provider API docs |
| Safety Checks | PASSED |
| Confidence | generated |

---

## 2. Protocol Translation

| Ucom Endpoint | CH Endpoint | Afterpay Endpoint | Notes |
|---|---|---|---|
| POST /v1/payments/auths | POST /checkouts/v1/orders | POST /v2/checkouts + POST /v2/payments/auth | Two-phase: checkout creation then auth with token |
| POST /v1/payments/auths/{id}/captures | POST /checkouts/v1/orders (capture) | POST /v2/payments/{orderId}/capture | Supports partial capture |
| POST /v1/payments/auths/{id}/refunds | POST /checkouts/v1/orders (refund) | POST /v2/payments/{orderId}/refund | Supports partial refund |
| POST /v1/payments/auths/{id}/void | POST /checkouts/v1/orders (void) | POST /v2/payments/{orderId}/void | Full void only, no partial |

---

## 3. Auth Flow: Two-Phase BNPL Pattern with Redirect

Afterpay BNPL authorization is a two-phase process with customer redirect (differs from Klarna's embedded widget):

```
Phase 1 -- Checkout Creation:
  Ucom POST /v1/payments/auths
    -> CH POST /checkouts/v1/orders (type: checkout)
      -> Afterpay POST /v2/checkouts
      <- Returns: token, redirectCheckoutUrl, expires
    <- CH returns: paymentToken (token), checkoutInteractions.actions.url (redirectCheckoutUrl)
  <- Ucom returns: afterpay.checkoutToken, afterpay.redirectUrl, status=PENDING

  [Merchant redirects customer to redirectCheckoutUrl]
  [Customer approves on Afterpay hosted page]
  [Afterpay redirects customer to merchant.redirectConfirmUrl]

Phase 2 -- Auth (after customer returns from Afterpay):
  Ucom POST /v1/payments/auths (with checkout token)
    -> CH POST /checkouts/v1/orders (type: authorize)
      -> Afterpay POST /v2/payments/auth
      <- Returns: id (orderId), status, originalAmount, paymentState
    <- CH returns: transactionId (orderId), transactionState
  <- Ucom returns: fdAuthorizationId, authStatus=APPROVED
```

---

## 4. Field Mapping: Auth Request (Ucom to CH)

### 4.1 Core Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.requestedAmount | number (decimal) | amount.total | number (decimal) | NONE | Y | Both use decimal; NUMBER_TO_STRING happens at CH-to-Afterpay boundary |
| authorization.currencyCode | string | amount.currency | string | PASSTHROUGH | Y | ISO 4217 (USD, AUD) |
| authorization.merchantId | string | merchantDetails.merchantId | string | PASSTHROUGH | Y | |
| authorization.storeId | string | merchantDetails.storeId | string | PASSTHROUGH | N | |
| authorization.fundingSource.type | string | paymentMethod.provider | string | MAP_ENUM | Y | Map to "AFTERPAY" |
| authorization.orderId | string | transactionDetails.merchantOrderId | string | PASSTHROUGH | Y | Merchant order reference |

### 4.2 Line Item Fields (Tier 1 -- CRITICAL for BNPL)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.purchaseInfo[].description | string | orderData.itemDetails[].itemName | string | PASSTHROUGH | Y | Afterpay requires item names |
| authorization.purchaseInfo[].unitPrice | number | orderData.itemDetails[].amountComponents.unitPrice | number | NONE | Y | |
| authorization.purchaseInfo[].quantity | number | orderData.itemDetails[].quantity | number | NONE | Y | |
| authorization.purchaseInfo[].lineTotal | number | orderData.itemDetails[].grossAmount | number | NONE | Y | |
| authorization.purchaseInfo[].sku | string | orderData.itemDetails[].productSKU | string | PASSTHROUGH | N | Max 128 chars |
| authorization.purchaseInfo[].productUrl | string | orderData.itemDetails[].itemUrl | string | PASSTHROUGH | N | |
| authorization.purchaseInfo[].imageUrl | string | orderData.itemDetails[].itemImageUrl | string | PASSTHROUGH | N | |

### 4.3 Customer and Address Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.customer.email | string | customer.email | string | PASSTHROUGH | Y | Required for Afterpay |
| authorization.customer.firstName | string | customer.firstName | string | PASSTHROUGH | Y | Maps to consumer.givenNames |
| authorization.customer.lastName | string | customer.lastName | string | PASSTHROUGH | Y | Maps to consumer.surname |
| authorization.customer.phone | string | customer.phone.phoneNumber | string | PASSTHROUGH | N | |
| authorization.shippingAddress.street | string | shippingAddress.address.street | string | PASSTHROUGH | Y | Maps to shipping.line1 |
| authorization.shippingAddress.street2 | string | shippingAddress.address.houseNumberOrName | string | PASSTHROUGH | N | Maps to shipping.line2 |
| authorization.shippingAddress.city | string | shippingAddress.address.city | string | PASSTHROUGH | Y | Maps to shipping.area1 |
| authorization.shippingAddress.state | string | shippingAddress.address.stateOrProvince | string | PASSTHROUGH | Y | Maps to shipping.region |
| authorization.shippingAddress.postalCode | string | shippingAddress.address.postalCode | string | PASSTHROUGH | Y | Maps to shipping.postcode |
| authorization.shippingAddress.country | string | shippingAddress.address.country | string | PASSTHROUGH | Y | ISO 3166-1 alpha-2; maps to shipping.countryCode |
| authorization.billingAddress.street | string | billingAddress.address.street | string | PASSTHROUGH | Y | Maps to billing.line1 |
| authorization.billingAddress.street2 | string | billingAddress.address.houseNumberOrName | string | PASSTHROUGH | N | Maps to billing.line2 |
| authorization.billingAddress.city | string | billingAddress.address.city | string | PASSTHROUGH | Y | Maps to billing.area1 |
| authorization.billingAddress.state | string | billingAddress.address.stateOrProvince | string | PASSTHROUGH | Y | Maps to billing.region |
| authorization.billingAddress.postalCode | string | billingAddress.address.postalCode | string | PASSTHROUGH | Y | Maps to billing.postcode |
| authorization.billingAddress.country | string | billingAddress.address.country | string | PASSTHROUGH | Y | Maps to billing.countryCode |

### 4.4 Afterpay-Specific Fields (New)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.fundingSource.afterpay.checkoutToken | string | paymentMethod.paymentToken.tokenData | string | PASSTHROUGH | Phase 2 | From Phase 1 checkout response |
| authorization.returnUrl | string | checkoutInteractions.returnUrls.successUrl | string | PASSTHROUGH | Y | Afterpay requires redirect URLs |
| authorization.cancelUrl | string | checkoutInteractions.returnUrls.cancelUrl | string | PASSTHROUGH | Y | Afterpay requires redirect URLs |

### 4.5 Headers

| Ucom Header | CH Header | Transform | Notes |
|---|---|---|---|
| Client-Request-Id | Client-Request-Id | PASSTHROUGH | Idempotency key |
| Authorization (HMAC) | Authorization (HMAC) | RECOMPUTE | Ucom HMAC to CH HMAC |
| Content-Type | Content-Type | PASSTHROUGH | application/json |
| [NEW] Auth-Token-Type | Auth-Token-Type | SET_VALUE | Set to "HMAC" |

---

## 5. Auth Response Mapping (CH to Ucom)

### 5.1 Core Response Fields

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| transactionProcessingDetails.transactionId | authorization.fdAuthorizationId | PASSTHROUGH | Maps to Afterpay orderId |
| transactionProcessingDetails.orderId | authorization.orderId | PASSTHROUGH | |
| gatewayResponse.transactionState | authorization.authStatus | MAP_ENUM | See enum table below |
| gatewayResponse.gatewayResponseCode | authorization.responseCode | PASSTHROUGH | |
| gatewayResponse.gatewayResponseMessage | authorization.responseMessage | PASSTHROUGH | |
| paymentReceipt.approvedAmount.total | authorization.approvedAmount | NONE | |
| paymentReceipt.approvedAmount.currency | authorization.currencyCode | PASSTHROUGH | |

### 5.2 Afterpay-Specific Response Fields (New)

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| paymentMethod.paymentToken.tokenData | authorization.fundingSource.afterpay.checkoutToken | PASSTHROUGH | Afterpay checkout token |
| checkoutInteractions.actions.url | authorization.fundingSource.afterpay.redirectUrl | PASSTHROUGH | URL to redirect customer |

### 5.3 Transaction State Enum Mapping

| CH transactionState | Ucom authStatus | Afterpay status |
|---|---|---|
| AUTHORIZED | APPROVED | APPROVED (auth) |
| CAPTURED | CAPTURED | APPROVED (capture) |
| DECLINED | DECLINED | DECLINED |
| VOIDED | CANCELLED | (void response) |

---

## 6. Capture Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| capture.amount | amount.total | NONE | Can be less than auth for partial |
| capture.currencyCode | amount.currency | PASSTHROUGH | |

---

## 7. Refund Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| refund.amount | amount.total | NONE | Partial amount supported |
| refund.currencyCode | amount.currency | PASSTHROUGH | |
| refund.referenceId | referenceTransactionDetails.referenceTransactionId | PASSTHROUGH | Used as Afterpay requestId (idempotency) |
| refund.reason | refundDescription | PASSTHROUGH | |

---

## 8. Cancel (Void) Mapping

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| (path param) authorizationId | transactionProcessingDetails.transactionId | PASSTHROUGH | Afterpay orderId |

Cancel response sets `authorization.authStatus = CANCELLED`.

---

## 9. Schema Changes Required on Ucom

### 9.1 FundingSourceType Enum Addition

Add "AFTERPAY" to the existing FundingSourceType enum alongside CREDIT, DEBIT, PREPAID, CASHAPP, KLARNA, etc.

### 9.2 New Afterpay Object on FundingSource

```yaml
Afterpay:
  type: object
  properties:
    checkoutToken:
      type: string
      description: Afterpay checkout token (response Phase 1, request Phase 2)
    redirectUrl:
      type: string
      description: URL to redirect customer to Afterpay checkout (response only)
      readOnly: true
```

### 9.3 purchaseInfo[] Requirement

**CRITICAL**: Same as Klarna -- Ucom's existing `purchaseInfo[]` object MUST be populated for all BNPL transactions. Afterpay requires line-item detail for checkout creation. If Ucom merchants are not currently sending line-item detail, they MUST start for Afterpay integration.

Ucom should add server-side validation:
- If `fundingSource.type = AFTERPAY` and `purchaseInfo[]` is empty or missing, reject with HTTP 400 and message: "Line item detail (purchaseInfo[]) is required for BNPL payment methods."

### 9.4 Return URL Requirement

**NEW for Afterpay (not required for Klarna)**: Ucom must pass `returnUrl` and `cancelUrl` for Afterpay transactions. These map to Afterpay's `merchant.redirectConfirmUrl` and `merchant.redirectCancelUrl`.

Ucom should add server-side validation:
- If `fundingSource.type = AFTERPAY` and `returnUrl` or `cancelUrl` is missing, reject with HTTP 400 and message: "Return URLs are required for redirect-based BNPL payment methods."

---

## 10. Auth Bridging

Same pattern as CashApp and Klarna adapters:
- Ucom HMAC signature is validated at the Ucom gateway
- CH HMAC is recomputed using CH credentials before forwarding
- Add `Auth-Token-Type: HMAC` header
- Afterpay auth uses HTTP Basic (Base64(username:password)) -- this is handled at the CH-to-Afterpay boundary, not exposed to Ucom

---

## 11. Error Code Mapping

| Afterpay Error | CH Error Code | Ucom Error Code | HTTP Status | Description |
|---|---|---|---|---|
| INVALID_OBJECT | VALIDATION_ERROR | 40001 | 400 | Invalid request body |
| INVALID_TOKEN | VALIDATION_ERROR | 40002 | 400 | Checkout token invalid or expired |
| NOT_FOUND | RESOURCE_NOT_FOUND | 40401 | 404 | Order not found |
| UNAUTHORIZED | AUTHORIZATION_FAILED | 40301 | 401 | Invalid credentials |
| DECLINED | PAYMENT_DECLINED | 40310 | 403 | Payment declined by Afterpay |
| CAPTURE_NOT_ALLOWED | CAPTURE_FAILED | 40903 | 409 | Order not in capturable state |
| REFUND_NOT_ALLOWED | REFUND_FAILED | 40904 | 409 | Order not in refundable state |
| VOID_NOT_ALLOWED | CANCEL_FAILED | 40905 | 409 | Order already captured |
| SERVER_ERROR | PROVIDER_ERROR | 50201 | 502 | Afterpay internal error |

---

## 12. BNPL-Specific Concerns

### 12.1 Line Item Requirement
Same as Klarna. Ucom merchants MUST send `purchaseInfo[]` for Afterpay. Empty line items cause Afterpay to reject the checkout creation. This applies to all BNPL providers.

### 12.2 Address Mapping
Ucom's Address object maps to CH's shippingAddress/billingAddress, which then maps to Afterpay's shipping/billing objects. Note the field name differences: Afterpay uses `line1/area1/region/postcode/countryCode` instead of Klarna's `street_address/city/postal_code/country`.

### 12.3 Return URL Handling
Unlike Klarna (embedded widget), Afterpay requires redirect URLs. Ucom must pass these through to CH which forwards them to Afterpay as `merchant.redirectConfirmUrl` and `merchant.redirectCancelUrl`.

### 12.4 Amount Transform Difference
Unlike Klarna (MULTIPLY_100/DIVIDE_100), the CH-to-Afterpay transform is NUMBER_TO_STRING/STRING_TO_NUMBER. The Ucom-to-CH boundary uses decimal numbers throughout -- the string conversion happens only at the CH-to-Afterpay boundary.

### 12.5 Regional Configuration

| Region | Currency | Afterpay API Base |
|---|---|---|
| US | USD | https://global-api-sandbox.afterpay.com |
| AU | AUD | https://global-api-sandbox.afterpay.com |

---

## 13. Supported Capabilities Matrix

| Capability | Ucom Support | CH Support | Afterpay Support | Notes |
|---|---|---|---|---|
| Auth (Checkout + Auth) | Y | Y | Y | Two-phase redirect flow |
| Full Capture | Y | Y | Y | |
| Partial Capture | Y | Y | Y | Amount-based (no line-item granularity) |
| Full Refund | Y | Y | Y | |
| Partial Refund | Y | Y | Y | |
| Void | Y | Y | Y | Only before capture |
| Immediate Capture | Y | Y | Y | POST /v2/payments/capture (auth + capture in one step) |
