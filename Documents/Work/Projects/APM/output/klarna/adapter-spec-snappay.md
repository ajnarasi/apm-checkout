# SnapPay - Commerce Hub Adapter Specification for Klarna BNPL

> Generated: 2026-04-12T05:00:00Z | Pattern: server-bnpl-v1 | Commerce Hub: 1.26.0302 | SnapPay: 3.0.9

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| Klarna Provider API | v1 |
| SnapPay | 3.0.9 |
| Pattern Template | server-bnpl-v1 |
| Golden Mapping Source | sandbox-validated-mapping |
| Safety Checks | PASSED |

---

## 2. Key Insight: SnapPay Level3 Data Advantage

SnapPay's `level3[]` line-item data structure was designed for Level 3 card processing (B2B/government purchasing cards). This structure maps naturally to Klarna's `order_lines[]` requirement, making the SnapPay-to-Klarna integration potentially smoother than Ucom-to-Klarna. SnapPay merchants already collect the detailed item data that BNPL providers require.

---

## 3. Protocol Translation

| SnapPay Operation | CH Endpoint | Klarna Endpoint | Notes |
|---|---|---|---|
| GetRequestID (init) | POST /checkouts/v1/orders (session) | POST /payments/v1/sessions | Returns session_id + client_token |
| charge | POST /checkouts/v1/orders (authorize + capture) | POST /payments/v1/authorizations/{auth_token}/order + POST /ordermanagement/v1/orders/{order_id}/captures | Combined auth+capture or split |
| refund | POST /checkouts/v1/orders (refund) | POST /ordermanagement/v1/orders/{order_id}/refunds | Partial supported |
| void | POST /checkouts/v1/orders (cancel) | POST /ordermanagement/v1/orders/{order_id}/cancel | Before capture only |

---

## 4. SnapPay Combined Auth+Capture Pattern

SnapPay uses a two-step combined pattern different from Ucom's granular lifecycle:

```
Step 1 — GetRequestID (Session Init):
  SnapPay GetRequestID (paymentmode=KLARNA)
    -> CH POST /checkouts/v1/orders (type: session)
      -> Klarna POST /payments/v1/sessions
      <- Returns: session_id, client_token, payment_method_categories[]
    <- CH returns session data
  <- SnapPay returns: requestid, klarnaSessionId, klarnaClientToken

  [Customer interacts with Klarna widget, approves payment]
  [Widget returns authorization_token to merchant frontend]

Step 2 — charge (Order Placement + Optional Capture):
  SnapPay charge (with klarna_auth_token)
    -> CH POST /checkouts/v1/orders (type: authorize)
      -> Klarna POST /payments/v1/authorizations/{auth_token}/order
      <- Returns: order_id, fraud_status
    -> (If auto-capture) CH POST /checkouts/v1/orders (type: capture)
      -> Klarna POST /ordermanagement/v1/orders/{order_id}/captures
      <- Returns: capture_id
    <- CH returns combined result
  <- SnapPay returns: transactionid, status

Step 3 (Optional) — Partial Capture:
  If merchant needs split shipment, separate capture calls per shipment
```

---

## 5. Domain Translation: Full Field Mapping

### 5.1 Session Creation / Auth Request (SnapPay to CH to Klarna)

| SnapPay Field | Type | CH Field | Type | Klarna Field | Type | Transform Chain | Tier |
|---|---|---|---|---|---|---|---|
| transactionamount | decimal | amount.total | decimal | order_amount | integer (cents) | NONE then MULTIPLY_100 | 1 |
| currencycode | string | amount.currency | string | purchase_currency | string | PASSTHROUGH chain | 1 |
| customer.country | string | customerAddress.country | string | purchase_country | string | PASSTHROUGH chain | 1 |
| orderid | string | transactionDetails.merchantOrderId | string | merchant_reference1 | string | PASSTHROUGH chain | 1 |
| taxamount | decimal | amountComponents.taxAmounts[0].taxAmount | decimal | order_tax_amount | integer (cents) | NONE then MULTIPLY_100 | 1 |
| level3[].itemdescription | string | orderData.itemDetails[].itemName | string | order_lines[].name | string | PASSTHROUGH chain | 1 |
| level3[].quantity | integer | orderData.itemDetails[].quantity | integer | order_lines[].quantity | integer | PASSTHROUGH chain | 1 |
| level3[].unitcost | decimal | orderData.itemDetails[].amountComponents.unitPrice | decimal | order_lines[].unit_price | integer (cents) | NONE then MULTIPLY_100 | 1 |
| level3[].lineitemtotal | decimal | orderData.itemDetails[].grossAmount | decimal | order_lines[].total_amount | integer (cents) | NONE then MULTIPLY_100 | 1 |
| level3[].taxamount | decimal | orderData.itemDetails[].taxAmounts[0].taxAmount | decimal | order_lines[].total_tax_amount | integer (cents) | NONE then MULTIPLY_100 | 1 |
| level3[].taxrate | decimal | orderData.itemDetails[].taxAmounts[0].taxRate | decimal | order_lines[].tax_rate | integer (basis pts) | MULTIPLY_10000 | 2 |
| level3[].productcode | string | orderData.itemDetails[].itemSku | string | order_lines[].reference | string | PASSTHROUGH chain | 2 |
| level3[].commoditycode | string | orderData.itemDetails[].commodityCode | string | N/A | N/A | STORE_IN_CH | 3 |
| level3[].unitofmeasure | string | orderData.itemDetails[].unitOfMeasure | string | N/A | N/A | STORE_IN_CH | 3 |
| customer.email | string | customer.email | string | shipping_address.email | string | PASSTHROUGH chain | 1 |
| customer.customername | string | customer.firstName + customer.lastName | string | shipping_address.given_name + family_name | string | SPLIT_ON_SPACE | 1 |
| customer.phone | string | customer.phone.phoneNumber | string | shipping_address.phone | string | PASSTHROUGH chain | 2 |
| customer.addressline1 | string | shippingAddress.address.street | string | shipping_address.street_address | string | PASSTHROUGH chain | 1 |
| customer.addressline2 | string | shippingAddress.address.street2 | string | shipping_address.street_address2 | string | PASSTHROUGH chain | 2 |
| customer.city | string | shippingAddress.address.city | string | shipping_address.city | string | PASSTHROUGH chain | 1 |
| customer.state | string | shippingAddress.address.stateOrProvince | string | shipping_address.region | string | PASSTHROUGH chain | 1 |
| customer.zipcode | string | shippingAddress.address.postalCode | string | shipping_address.postal_code | string | PASSTHROUGH chain | 1 |
| customer.country | string | shippingAddress.address.country | string | shipping_address.country | string | PASSTHROUGH chain | 1 |
| redirecturl | string | checkoutInteractions.returnUrls.successUrl | string | N/A | N/A | STORED_FOR_REDIRECT | 2 |
| callbackurl | string | checkoutInteractions.callbackUrl | string | N/A | N/A | STORED_FOR_WEBHOOK | 2 |

### 5.2 Customer Name Split Transform

SnapPay sends `customer.customername` as a single string. Both CH and Klarna require separate first/last name fields.

Transform rule: `SPLIT_ON_SPACE`
- Split on first space character
- Everything before first space = firstName / given_name
- Everything after first space = lastName / family_name
- If no space, entire string = firstName, lastName = empty string

### 5.3 Auth/Charge Response (Klarna to CH to SnapPay)

| Klarna Field | CH Field | SnapPay Field | Transform Chain | Tier |
|---|---|---|---|---|
| session_id | order.providerOrderId | klarnaSessionId | PASSTHROUGH chain | 1 |
| client_token | paymentMethod.paymentToken.tokenData | klarnaClientToken | PASSTHROUGH chain | 1 |
| order_id | transactionProcessingDetails.transactionId | transactionid | PASSTHROUGH chain | 1 |
| fraud_status | gatewayResponse.transactionState | transactionstatus | MAP_ENUM chain | 1 |
| authorized_payment_method.type | paymentMethod.type | klarnaPaymentMethod | PASSTHROUGH chain | 2 |
| order_amount | paymentReceipt.approvedAmount.total | approvedamount | DIVIDE_100 chain | 1 |
| expires_at | transactionProcessingDetails.expiresAt | expirationdate | ISO8601_FORMAT | 2 |

### 5.4 Transaction State Mapping Chain

| Klarna fraud_status | CH transactionState | SnapPay transactionstatus |
|---|---|---|
| ACCEPTED | AUTHORIZED | APPROVED |
| PENDING | PENDING | PENDING |
| REJECTED | DECLINED | DECLINED |

---

## 6. Capture Mapping (SnapPay to CH to Klarna)

| SnapPay Field | CH Field | Klarna Field | Transform | Tier |
|---|---|---|---|---|
| transactionamount | amount.total | captured_amount | NONE then MULTIPLY_100 | 1 |
| level3[].itemdescription | orderData.itemDetails[].itemName | order_lines[].name | PASSTHROUGH | 1 |
| level3[].quantity | orderData.itemDetails[].quantity | order_lines[].quantity | PASSTHROUGH | 1 |
| level3[].lineitemtotal | orderData.itemDetails[].grossAmount | order_lines[].total_amount | NONE then MULTIPLY_100 | 1 |
| level3[].taxamount | orderData.itemDetails[].taxAmounts[0].taxAmount | order_lines[].total_tax_amount | NONE then MULTIPLY_100 | 1 |
| shippingtracking | shippingInfo.trackingNumber | shipping_info[].tracking_number | PASSTHROUGH | 2 |
| shippingcarrier | shippingInfo.shippingCarrier | shipping_info[].shipping_company | PASSTHROUGH | 2 |

### Capture Response

| Klarna Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| capture_id | transactionProcessingDetails.captureId | captureid | PASSTHROUGH | 1 |
| captured_amount | paymentReceipt.approvedAmount.total | capturedamount | DIVIDE_100 | 1 |

---

## 7. Refund Mapping (SnapPay to CH to Klarna)

| SnapPay Field | CH Field | Klarna Field | Transform | Tier |
|---|---|---|---|---|
| refundamount | amount.total | refunded_amount | NONE then MULTIPLY_100 | 1 |
| level3[].itemdescription | orderData.itemDetails[].itemName | order_lines[].name | PASSTHROUGH | 2 |
| level3[].quantity | orderData.itemDetails[].quantity | order_lines[].quantity | PASSTHROUGH | 2 |
| level3[].lineitemtotal | orderData.itemDetails[].grossAmount | order_lines[].total_amount | NONE then MULTIPLY_100 | 2 |
| refundreason | refundDescription | description | PASSTHROUGH | 2 |

### Refund Response

| Klarna Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| refund_id | transactionProcessingDetails.refundId | refundid | PASSTHROUGH | 1 |
| refunded_amount | paymentReceipt.refundedAmount.total | refundedamount | DIVIDE_100 | 1 |

---

## 8. Cancel (Void) Mapping

Cancel requires only the order reference. No request body fields beyond the order ID in the URL path.

| SnapPay Field | CH Field | Klarna Field | Transform | Tier |
|---|---|---|---|---|
| transactionid (path) | transactionProcessingDetails.transactionId | order_id (path) | PASSTHROUGH | 1 |

Response sets `transactionstatus = VOIDED`.

---

## 9. Unmappable B2B Fields

The following SnapPay fields are B2B/ERP-specific and have no equivalent in CH or Klarna. They are stored in the adapter configuration layer and not passed downstream:

| SnapPay Field | Disposition |
|---|---|
| companycode | Stored in adapter config |
| branchplant | Stored in adapter config |
| supplier.supplierid | Stored in adapter config |
| supplier.suppliername | Stored in adapter config |
| clxstream[] | Stored in adapter config |
| ordertype | Stored in adapter config |
| jdeinstance | Stored in adapter config |
| aboreason | Stored in adapter config |
| level3[].commoditycode | Passed to CH, not to Klarna |
| level3[].unitofmeasure | Passed to CH, not to Klarna |

---

## 10. Schema Changes Required on SnapPay

### 10.1 New Payment Mode

Add "KLARNA" as a valid `paymentmode` value alongside existing CC, ACH, CASHAPP.

### 10.2 New Response Fields

Add to the SnapPay charge response schema:

```yaml
klarnaSessionId:
  type: string
  description: Klarna session ID for SDK initialization
klarnaClientToken:
  type: string
  description: Client token for Klarna JS SDK widget
klarnaPaymentMethod:
  type: string
  description: Klarna payment method selected by customer
  enum: [pay_later, pay_over_time, direct_debit, direct_bank_transfer]
```

### 10.3 GetRequestID Enhancement

The GetRequestID response needs new fields for the Klarna session:

```yaml
klarnaSessionId:
  type: string
  description: Session ID from Klarna (Phase 1)
klarnaClientToken:
  type: string
  description: Client token for frontend SDK initialization
klarnaPaymentCategories:
  type: array
  items:
    type: string
  description: Available Klarna payment method categories
```

### 10.4 New Request Field for Phase 2

Add to the charge request:

```yaml
klarnaAuthToken:
  type: string
  description: Authorization token received from Klarna JS SDK after customer approval
```

---

## 11. Error Code Mapping

| Klarna Error | CH Error Code | SnapPay Error Code | HTTP Status | Description |
|---|---|---|---|---|
| BAD_VALUE | VALIDATION_ERROR | 4001 | 400 | Invalid field value |
| NOT_FOUND | RESOURCE_NOT_FOUND | 4041 | 404 | Order/session not found |
| FORBIDDEN | AUTHORIZATION_FAILED | 4031 | 403 | Invalid credentials |
| NOT_ALLOWED | INVALID_OPERATION | 4091 | 409 | Invalid state transition |
| ORDER_AMOUNT_MISMATCH | AMOUNT_MISMATCH | 4002 | 400 | Amount exceeds order total |
| CAPTURE_NOT_ALLOWED | CAPTURE_FAILED | 4093 | 409 | Not in capturable state |
| REFUND_NOT_ALLOWED | REFUND_FAILED | 4094 | 409 | Not in refundable state |
| CANCEL_NOT_ALLOWED | CANCEL_FAILED | 4095 | 409 | Already captured |
| FRAUD_REJECTED | FRAUD_DECLINED | 4032 | 403 | Klarna fraud check rejected |
| SERVER_ERROR | PROVIDER_ERROR | 5021 | 502 | Klarna internal error |

---

## 12. Regional Configuration

| Region | SnapPay Currency | Klarna purchase_country | Klarna Locale | Klarna API Base |
|---|---|---|---|---|
| US | USD | US | en-US | https://api-na.playground.klarna.com |
| UK | GBP | GB | en-GB | https://api-eu.playground.klarna.com |
| DE | EUR | DE | de-DE | https://api-eu.playground.klarna.com |
| FR | EUR | FR | fr-FR | https://api-eu.playground.klarna.com |

---

## 13. Auth Bridging

SnapPay authentication uses API key-based auth. The adapter layer:
1. Validates SnapPay API key at the gateway
2. Maps to CH HMAC credentials for the CH boundary
3. CH maps to HTTP Basic (Base64(username:password)) for the Klarna boundary
4. Each boundary handles its own auth -- credentials are never passed through

---

## 14. Supported Capabilities Matrix

| Capability | SnapPay Support | CH Support | Klarna Support | Notes |
|---|---|---|---|---|
| Session Init (GetRequestID) | Y | Y | Y | Returns client_token |
| Auth + Capture (charge) | Y | Y | Y | Combined or split |
| Partial Capture | Y (via level3 subset) | Y | Y | Natural fit with L3 data |
| Partial Refund | Y | Y | Y | |
| Cancel (Void) | Y | Y | Y | Before capture only |
| Extend Auth | N | N | Y | Not mapped |
| Update Order | N | N | Y | Not mapped |
