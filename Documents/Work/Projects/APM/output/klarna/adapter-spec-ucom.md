# Ucom - Commerce Hub Adapter Specification for Klarna BNPL

> Generated: 2026-04-12T05:00:00Z | Pattern: server-bnpl-v1 | Commerce Hub: 1.26.0302 | Ucom: 0.2.3

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| Klarna Provider API | v1 |
| Ucom | 0.2.3 |
| Pattern Template | server-bnpl-v1 |
| Golden Mapping Source | sandbox-validated-mapping |
| Safety Checks | PASSED |

---

## 2. Protocol Translation

| Ucom Endpoint | CH Endpoint | Klarna Endpoint | Notes |
|---|---|---|---|
| POST /v1/payments/auths | POST /checkouts/v1/orders | POST /payments/v1/sessions + POST /payments/v1/authorizations/{auth_token}/order | Two-phase: session creation then order placement |
| POST /v1/payments/auths/{id}/captures | POST /checkouts/v1/orders (capture) | POST /ordermanagement/v1/orders/{order_id}/captures | Supports partial capture via order_lines subset |
| POST /v1/payments/auths/{id}/refunds | POST /checkouts/v1/orders (refund) | POST /ordermanagement/v1/orders/{order_id}/refunds | Supports partial refund |
| POST /v1/payments/auths/{id}/void | POST /checkouts/v1/orders (cancel) | POST /ordermanagement/v1/orders/{order_id}/cancel | Full cancel only, no partial |

---

## 3. Auth Flow: Two-Phase BNPL Pattern

Klarna BNPL authorization is a two-phase process, unlike single-call card auth:

```
Phase 1 — Session Creation:
  Ucom POST /v1/payments/auths
    -> CH POST /checkouts/v1/orders (type: session)
      -> Klarna POST /payments/v1/sessions
      <- Returns: session_id, client_token, payment_method_categories[]
    <- CH returns: providerOrderId (session_id), paymentToken (client_token)
  <- Ucom returns: klarna.sessionId, klarna.clientToken, status=PENDING

Phase 2 — Order Placement (after customer approves in Klarna widget):
  Ucom POST /v1/payments/auths (with auth_token from widget callback)
    -> CH POST /checkouts/v1/orders (type: authorize)
      -> Klarna POST /payments/v1/authorizations/{auth_token}/order
      <- Returns: order_id, fraud_status, authorized_payment_method
    <- CH returns: transactionId (order_id), transactionState
  <- Ucom returns: fdAuthorizationId, authStatus=APPROVED
```

---

## 4. Field Mapping: Auth Request (Ucom to CH)

### 4.1 Core Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.requestedAmount | number (decimal) | amount.total | number (decimal) | NONE | Y | Both use decimal representation |
| authorization.currencyCode | string | amount.currency | string | PASSTHROUGH | Y | ISO 4217 (USD, GBP, EUR) |
| authorization.merchantId | string | merchantDetails.merchantId | string | PASSTHROUGH | Y | Merchant: PN129867 |
| authorization.storeId | string | merchantDetails.storeId | string | PASSTHROUGH | N | |
| authorization.fundingSource.type | string | paymentMethod.provider | string | MAP_ENUM | Y | Map to "KLARNA" |
| authorization.orderId | string | transactionDetails.merchantOrderId | string | PASSTHROUGH | Y | Merchant order reference |

### 4.2 Line Item Fields (Tier 1 -- CRITICAL for BNPL)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.purchaseInfo[].description | string | orderData.itemDetails[].itemName | string | PASSTHROUGH | Y | Klarna requires item names |
| authorization.purchaseInfo[].unitPrice | number | orderData.itemDetails[].amountComponents.unitPrice | number | NONE | Y | |
| authorization.purchaseInfo[].quantity | number | orderData.itemDetails[].quantity | number | NONE | Y | |
| authorization.purchaseInfo[].lineTotal | number | orderData.itemDetails[].grossAmount | number | NONE | Y | |
| authorization.purchaseInfo[].taxAmount | number | orderData.itemDetails[].taxAmounts[0].taxAmount | number | NONE | Y | |
| authorization.purchaseInfo[].sku | string | orderData.itemDetails[].itemSku | string | PASSTHROUGH | N | |
| authorization.purchaseInfo[].productUrl | string | orderData.itemDetails[].productUrl | string | PASSTHROUGH | N | |
| authorization.purchaseInfo[].imageUrl | string | orderData.itemDetails[].imageUrl | string | PASSTHROUGH | N | |

### 4.3 Customer and Address Fields (Tier 1)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.customer.email | string | customer.email | string | PASSTHROUGH | Y | Required for Klarna |
| authorization.customer.firstName | string | customer.firstName | string | PASSTHROUGH | Y | |
| authorization.customer.lastName | string | customer.lastName | string | PASSTHROUGH | Y | |
| authorization.customer.phone | string | customer.phone.phoneNumber | string | PASSTHROUGH | N | |
| authorization.shippingAddress.street | string | shippingAddress.address.street | string | PASSTHROUGH | Y | |
| authorization.shippingAddress.city | string | shippingAddress.address.city | string | PASSTHROUGH | Y | |
| authorization.shippingAddress.state | string | shippingAddress.address.stateOrProvince | string | PASSTHROUGH | Y | |
| authorization.shippingAddress.postalCode | string | shippingAddress.address.postalCode | string | PASSTHROUGH | Y | |
| authorization.shippingAddress.country | string | shippingAddress.address.country | string | PASSTHROUGH | Y | ISO 3166-1 alpha-2 |
| authorization.billingAddress.street | string | billingAddress.address.street | string | PASSTHROUGH | Y | |
| authorization.billingAddress.city | string | billingAddress.address.city | string | PASSTHROUGH | Y | |
| authorization.billingAddress.state | string | billingAddress.address.stateOrProvince | string | PASSTHROUGH | Y | |
| authorization.billingAddress.postalCode | string | billingAddress.address.postalCode | string | PASSTHROUGH | Y | |
| authorization.billingAddress.country | string | billingAddress.address.country | string | PASSTHROUGH | Y | |

### 4.4 Klarna-Specific Fields (New)

| Ucom Field | Type | CH Field | Type | Transform | Required | Notes |
|---|---|---|---|---|---|---|
| authorization.fundingSource.klarna.locale | string | [Klarna-specific] locale | string | PASSTHROUGH | Y | e.g., en-US, en-GB, de-DE |
| authorization.fundingSource.klarna.authToken | string | [Klarna-specific] authorization_token | string | PASSTHROUGH | Phase 2 | From Klarna JS SDK callback |

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
| transactionProcessingDetails.transactionId | authorization.fdAuthorizationId | PASSTHROUGH | Maps to Klarna order_id |
| transactionProcessingDetails.orderId | authorization.orderId | PASSTHROUGH | |
| gatewayResponse.transactionState | authorization.authStatus | MAP_ENUM | See enum table below |
| gatewayResponse.gatewayResponseCode | authorization.responseCode | PASSTHROUGH | |
| gatewayResponse.gatewayResponseMessage | authorization.responseMessage | PASSTHROUGH | |
| paymentReceipt.approvedAmount.total | authorization.approvedAmount | NONE | |
| paymentReceipt.approvedAmount.currency | authorization.currencyCode | PASSTHROUGH | |

### 5.2 Klarna-Specific Response Fields (New)

| CH Field | Ucom Field | Transform | Notes |
|---|---|---|---|
| order.providerOrderId | authorization.fundingSource.klarna.sessionId | PASSTHROUGH | Klarna session_id |
| paymentMethod.paymentToken.tokenData | authorization.fundingSource.klarna.clientToken | PASSTHROUGH | For Klarna JS SDK init |
| paymentMethod.type | authorization.fundingSource.klarna.paymentMethodCategory | PASSTHROUGH | pay_later, pay_over_time, etc. |

### 5.3 Transaction State Enum Mapping

| CH transactionState | Ucom authStatus | Klarna fraud_status |
|---|---|---|
| AUTHORIZED | APPROVED | ACCEPTED |
| PENDING | PENDING | PENDING |
| DECLINED | DECLINED | REJECTED |
| VOIDED | CANCELLED | N/A |

---

## 6. Capture Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| capture.amount | amount.total | NONE | Can be less than auth for partial |
| capture.currencyCode | amount.currency | PASSTHROUGH | |
| capture.lineItems[].description | orderData.itemDetails[].itemName | PASSTHROUGH | For partial capture, subset of auth items |
| capture.lineItems[].quantity | orderData.itemDetails[].quantity | NONE | |
| capture.lineItems[].lineTotal | orderData.itemDetails[].grossAmount | NONE | |
| capture.lineItems[].taxAmount | orderData.itemDetails[].taxAmounts[0].taxAmount | NONE | |
| capture.shippingInfo.trackingNumber | shippingInfo.trackingNumber | PASSTHROUGH | Klarna recommends including |
| capture.shippingInfo.carrier | shippingInfo.shippingCarrier | PASSTHROUGH | |

---

## 7. Refund Field Mapping (Ucom to CH)

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| refund.amount | amount.total | NONE | Partial amount supported |
| refund.currencyCode | amount.currency | PASSTHROUGH | |
| refund.lineItems[].description | orderData.itemDetails[].itemName | PASSTHROUGH | Optional: specify which items refunded |
| refund.lineItems[].quantity | orderData.itemDetails[].quantity | NONE | |
| refund.lineItems[].lineTotal | orderData.itemDetails[].grossAmount | NONE | |
| refund.reason | refundDescription | PASSTHROUGH | |

---

## 8. Cancel (Void) Mapping

| Ucom Field | CH Field | Transform | Notes |
|---|---|---|---|
| (path param) authorizationId | transactionProcessingDetails.transactionId | PASSTHROUGH | Klarna order_id |

Cancel response sets `authorization.authStatus = CANCELLED`.

---

## 9. Schema Changes Required on Ucom

### 9.1 FundingSourceType Enum Addition

Add "KLARNA" to the existing FundingSourceType enum alongside CREDIT, DEBIT, PREPAID, CASHAPP, etc.

### 9.2 New Klarna Object on FundingSource

```yaml
Klarna:
  type: object
  properties:
    locale:
      type: string
      description: Locale for Klarna session (e.g., en-US, en-GB, de-DE, fr-FR)
      example: "en-US"
    authToken:
      type: string
      description: Authorization token from Klarna JS SDK callback (request, Phase 2 only)
    clientToken:
      type: string
      description: Token for Klarna JS SDK initialization (response only)
      readOnly: true
    sessionId:
      type: string
      description: Klarna session ID (response only)
      readOnly: true
    paymentMethodCategory:
      type: string
      description: Selected Klarna payment method category
      enum: [pay_later, pay_over_time, direct_debit, direct_bank_transfer]
      readOnly: true
```

### 9.3 purchaseInfo[] Requirement

**CRITICAL**: Ucom's existing `purchaseInfo[]` object MUST be populated for all BNPL transactions. Klarna requires line-item detail for underwriting. If Ucom merchants are not currently sending line-item detail, they MUST start for Klarna integration. This is the one area where "zero merchant code changes" may not hold -- merchants must send item data.

Ucom should add server-side validation:
- If `fundingSource.type = KLARNA` and `purchaseInfo[]` is empty or missing, reject with HTTP 400 and message: "Line item detail (purchaseInfo[]) is required for BNPL payment methods."

### 9.4 Capture Endpoint Enhancement

Ucom's capture endpoint currently accepts only amount. For Klarna partial capture, it needs to also accept line items:
- Add optional `lineItems[]` array to capture request body
- Add optional `shippingInfo` object for tracking data

---

## 10. Auth Bridging

Same pattern as CashApp adapter:
- Ucom HMAC signature is validated at the Ucom gateway
- CH HMAC is recomputed using CH credentials before forwarding
- Add `Auth-Token-Type: HMAC` header
- Klarna auth uses HTTP Basic (Base64(username:password)) -- this is handled at the CH-to-Klarna boundary, not exposed to Ucom

---

## 11. Error Code Mapping

| Klarna Error | CH Error Code | Ucom Error Code | HTTP Status | Description |
|---|---|---|---|---|
| BAD_VALUE | VALIDATION_ERROR | 40001 | 400 | Invalid field value |
| NOT_FOUND | RESOURCE_NOT_FOUND | 40401 | 404 | Order/session not found |
| FORBIDDEN | AUTHORIZATION_FAILED | 40301 | 403 | Invalid credentials |
| NOT_ALLOWED | INVALID_OPERATION | 40901 | 409 | Invalid state transition |
| ORDER_AMOUNT_MISMATCH | AMOUNT_MISMATCH | 40002 | 400 | Capture/refund exceeds order |
| CAPTURE_NOT_ALLOWED | CAPTURE_FAILED | 40903 | 409 | Order not in capturable state |
| REFUND_NOT_ALLOWED | REFUND_FAILED | 40904 | 409 | Order not in refundable state |
| CANCEL_NOT_ALLOWED | CANCEL_FAILED | 40905 | 409 | Order already captured |
| FRAUD_REJECTED | FRAUD_DECLINED | 40310 | 403 | Klarna fraud check rejected |
| SERVER_ERROR | PROVIDER_ERROR | 50201 | 502 | Klarna internal error |

---

## 12. BNPL-Specific Concerns

### 12.1 Line Item Requirement
Ucom merchants MUST send `purchaseInfo[]` for Klarna. Empty line items cause Klarna to reject the session creation. This applies to all BNPL providers, not just Klarna.

### 12.2 Address Mapping
Ucom's Address object maps cleanly to CH's shippingAddress/billingAddress. No transforms needed beyond passthrough. Both shipping and billing are required for Klarna.

### 12.3 Partial Capture with Line Items
Klarna's partial capture operates on order_lines[] subsets. Ucom's capture endpoint needs enhancement to support passing specific line items for partial capture. Without this, only full-amount capture is possible.

### 12.4 Regional Locale Mapping

| Region | Locale | Currency | Klarna Base URL |
|---|---|---|---|
| US | en-US | USD | https://api-na.playground.klarna.com |
| UK | en-GB | GBP | https://api-eu.playground.klarna.com |
| DE | de-DE | EUR | https://api-eu.playground.klarna.com |
| FR | fr-FR | EUR | https://api-eu.playground.klarna.com |

### 12.5 Klarna JS SDK Integration
The client_token returned in Phase 1 must be passed to the merchant's frontend to initialize the Klarna JS SDK widget. The widget handles customer authentication and returns an authorization_token for Phase 2. This is an out-of-band interaction that Ucom does not mediate.

---

## 13. Supported Capabilities Matrix

| Capability | Ucom Support | CH Support | Klarna Support | Notes |
|---|---|---|---|---|
| Auth (Session + Order) | Y | Y | Y | Two-phase flow |
| Full Capture | Y | Y | Y | |
| Partial Capture | NEEDS ENHANCEMENT | Y | Y | Ucom needs line item support on capture |
| Partial Refund | Y | Y | Y | |
| Cancel (Void) | Y | Y | Y | Only before capture |
| Extend Auth | N | N | Y | Klarna supports but not mapped |
| Update Order | N | N | Y | Klarna supports but not mapped |
