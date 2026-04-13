# SnapPay - Commerce Hub Adapter Specification for Afterpay BNPL

> Generated: 2026-04-12T05:30:00Z | Pattern: server-bnpl-v1 | Commerce Hub: 1.26.0302 | SnapPay: 3.0.9 | Confidence: generated

---

## 1. Version Contract

| Component | Version |
|---|---|
| Commerce Hub | 1.26.0302 |
| Afterpay Provider API | v2 |
| SnapPay | 3.0.9 |
| Pattern Template | server-bnpl-v1 |
| Golden Mapping Source | NONE -- generated from BNPL template + provider API docs |
| Safety Checks | PASSED |
| Confidence | generated |

---

## 2. Key Insight: SnapPay Level3 Data Advantage

SnapPay's `level3[]` line-item data structure was designed for Level 3 card processing (B2B/government purchasing cards). This structure maps naturally to Afterpay's `items[]` requirement, making the SnapPay-to-Afterpay integration potentially smoother than Ucom-to-Afterpay. SnapPay merchants already collect the detailed item data that BNPL providers require.

**Additional note for Afterpay**: Unlike Klarna's flat integer `unit_price`, Afterpay requires a Money object `{amount: "20.00", currency: "USD"}` for each item's price. The adapter must construct this Money object from SnapPay's flat `unitcost` field and the transaction currency.

---

## 3. Protocol Translation

| SnapPay Operation | CH Endpoint | Afterpay Endpoint | Notes |
|---|---|---|---|
| GetRequestID (init) | POST /checkouts/v1/orders (checkout) | POST /v2/checkouts | Returns token + redirectCheckoutUrl |
| charge | POST /checkouts/v1/orders (auth or capture) | POST /v2/payments/auth or POST /v2/payments/capture | Deferred or immediate capture |
| capture | POST /checkouts/v1/orders (capture) | POST /v2/payments/{orderId}/capture | Post-auth capture |
| refund | POST /checkouts/v1/orders (refund) | POST /v2/payments/{orderId}/refund | Partial supported |
| void | POST /checkouts/v1/orders (void) | POST /v2/payments/{orderId}/void | Before capture only |

---

## 4. SnapPay Auth Flow with Afterpay Redirect

SnapPay uses a two-step pattern with customer redirect:

```
Step 1 -- GetRequestID (Checkout Init):
  SnapPay GetRequestID (paymentmode=AFTERPAY)
    -> CH POST /checkouts/v1/orders (type: checkout)
      -> Afterpay POST /v2/checkouts
      <- Returns: token, redirectCheckoutUrl, expires
    <- CH returns checkout data
  <- SnapPay returns: requestid, afterpayCheckoutToken, afterpayRedirectUrl

  [Merchant redirects customer to afterpayRedirectUrl]
  [Customer approves on Afterpay hosted checkout page]
  [Afterpay redirects customer to merchant redirectConfirmUrl]

Step 2 -- charge (Auth or Immediate Capture):
  SnapPay charge (with afterpay_checkout_token)
    -> CH POST /checkouts/v1/orders (type: authorize)
      -> Afterpay POST /v2/payments/auth (deferred)
         OR Afterpay POST /v2/payments/capture (immediate)
      <- Returns: id (orderId), status, originalAmount, paymentState
    <- CH returns result
  <- SnapPay returns: transactionid, status

Step 3 (Optional) -- Capture after Auth:
  SnapPay capture
    -> CH POST /checkouts/v1/orders (type: capture)
      -> Afterpay POST /v2/payments/{orderId}/capture
      <- Returns: updated order with paymentState
    <- CH returns capture result
  <- SnapPay returns: captureid, status
```

---

## 5. Domain Translation: Full Field Mapping

### 5.1 Checkout Creation / Auth Request (SnapPay to CH to Afterpay)

| SnapPay Field | Type | CH Field | Type | Afterpay Field | Type | Transform Chain | Tier |
|---|---|---|---|---|---|---|---|
| transactionamount | decimal | amount.total | decimal | amount.amount | string | NONE then NUMBER_TO_STRING | 1 |
| currencycode | string | amount.currency | string | amount.currency | string | PASSTHROUGH chain | 1 |
| orderid | string | transactionDetails.merchantOrderId | string | merchantReference | string | PASSTHROUGH chain | 1 |
| level3[].itemdescription | string | orderData.itemDetails[].itemName | string | items[].name | string | PASSTHROUGH chain | 1 |
| level3[].quantity | integer | orderData.itemDetails[].quantity | integer | items[].quantity | integer | PASSTHROUGH chain | 1 |
| level3[].unitcost | decimal | orderData.itemDetails[].amountComponents.unitPrice | decimal | items[].price.amount | string | NONE then NUMBER_TO_STRING | 1 |
| currencycode | string | amount.currency | string | items[].price.currency | string | PASSTHROUGH chain | 1 |
| level3[].productcode | string | orderData.itemDetails[].productSKU | string | items[].sku | string | PASSTHROUGH chain | 2 |
| level3[].commoditycode | string | orderData.itemDetails[].commodityCode | string | N/A | N/A | STORE_IN_CH | 3 |
| level3[].unitofmeasure | string | orderData.itemDetails[].unitOfMeasure | string | N/A | N/A | STORE_IN_CH | 3 |
| customer.email | string | customer.email | string | consumer.email | string | PASSTHROUGH chain | 1 |
| customer.customername | string | customer.firstName + customer.lastName | string | consumer.givenNames + consumer.surname | string | SPLIT_ON_SPACE | 1 |
| customer.phone | string | customer.phone.phoneNumber | string | consumer.phoneNumber | string | PASSTHROUGH chain | 2 |
| customer.addressline1 | string | shippingAddress.address.street | string | shipping.line1 | string | PASSTHROUGH chain | 1 |
| customer.addressline2 | string | shippingAddress.address.houseNumberOrName | string | shipping.line2 | string | PASSTHROUGH chain | 2 |
| customer.city | string | shippingAddress.address.city | string | shipping.area1 | string | PASSTHROUGH chain | 1 |
| customer.state | string | shippingAddress.address.stateOrProvince | string | shipping.region | string | PASSTHROUGH chain | 1 |
| customer.zipcode | string | shippingAddress.address.postalCode | string | shipping.postcode | string | PASSTHROUGH chain | 1 |
| customer.country | string | shippingAddress.address.country | string | shipping.countryCode | string | PASSTHROUGH chain | 1 |
| redirecturl | string | checkoutInteractions.returnUrls.successUrl | string | merchant.redirectConfirmUrl | string | PASSTHROUGH chain | 1 |
| callbackurl | string | checkoutInteractions.returnUrls.cancelUrl | string | merchant.redirectCancelUrl | string | PASSTHROUGH chain | 1 |

### 5.2 Customer Name Split Transform

Same as Klarna adapter. SnapPay sends `customer.customername` as a single string. Both CH and Afterpay require separate first/last name fields.

Transform rule: `SPLIT_ON_SPACE`
- Split on first space character
- Everything before first space = firstName / givenNames
- Everything after first space = lastName / surname
- If no space, entire string = firstName, lastName = empty string

### 5.3 Auth/Capture Response (Afterpay to CH to SnapPay)

| Afterpay Field | CH Field | SnapPay Field | Transform Chain | Tier |
|---|---|---|---|---|
| token | paymentMethod.paymentToken.tokenData | afterpayCheckoutToken | PASSTHROUGH chain | 1 |
| redirectCheckoutUrl | checkoutInteractions.actions.url | afterpayRedirectUrl | PASSTHROUGH chain | 1 |
| id | transactionProcessingDetails.transactionId | transactionid | PASSTHROUGH chain | 1 |
| status | gatewayResponse.transactionState | transactionstatus | MAP_ENUM chain | 1 |
| originalAmount.amount | paymentReceipt.approvedAmount.total | approvedamount | STRING_TO_NUMBER chain | 1 |
| originalAmount.currency | paymentReceipt.approvedAmount.currency | currencycode | PASSTHROUGH chain | 1 |

### 5.4 Transaction State Mapping Chain

| Afterpay status | CH transactionState | SnapPay transactionstatus |
|---|---|---|
| APPROVED | AUTHORIZED | APPROVED |
| DECLINED | DECLINED | DECLINED |

| Afterpay paymentState | CH transactionState | SnapPay transactionstatus |
|---|---|---|
| AUTH_APPROVED | AUTHORIZED | APPROVED |
| CAPTURED | CAPTURED | CAPTURED |
| PARTIALLY_CAPTURED | PARTIALLY_CAPTURED | PARTIAL_CAPTURED |
| VOIDED | VOIDED | VOIDED |

---

## 6. Capture Mapping (SnapPay to CH to Afterpay)

| SnapPay Field | CH Field | Afterpay Field | Transform | Tier |
|---|---|---|---|---|
| transactionamount | amount.total | amount.amount | NONE then NUMBER_TO_STRING | 1 |
| currencycode | amount.currency | amount.currency | PASSTHROUGH | 1 |

### Capture Response

| Afterpay Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| id | transactionProcessingDetails.transactionId | transactionid | PASSTHROUGH | 1 |
| originalAmount.amount | paymentReceipt.approvedAmount.total | capturedamount | STRING_TO_NUMBER | 1 |
| paymentState | gatewayResponse.transactionState | transactionstatus | MAP_ENUM | 1 |

---

## 7. Refund Mapping (SnapPay to CH to Afterpay)

| SnapPay Field | CH Field | Afterpay Field | Transform | Tier |
|---|---|---|---|---|
| refundamount | amount.total | amount.amount | NONE then NUMBER_TO_STRING | 1 |
| currencycode | amount.currency | amount.currency | PASSTHROUGH | 1 |
| transactionid | referenceTransactionDetails.referenceTransactionId | requestId | PASSTHROUGH | 1 |
| refundreason | refundDescription | merchantReference | PASSTHROUGH | 2 |

### Refund Response

| Afterpay Field | CH Field | SnapPay Field | Transform | Tier |
|---|---|---|---|---|
| refundId | paymentReceipt.processorResponseDetails.referenceNumber | refundid | PASSTHROUGH | 1 |
| amount.amount | paymentReceipt.refundedAmount.total | refundedamount | STRING_TO_NUMBER | 1 |

---

## 8. Cancel (Void) Mapping

Cancel requires only the order reference. No request body fields beyond the order ID in the URL path.

| SnapPay Field | CH Field | Afterpay Field | Transform | Tier |
|---|---|---|---|---|
| transactionid (path) | transactionProcessingDetails.transactionId | orderId (path) | PASSTHROUGH | 1 |

Response sets `transactionstatus = VOIDED`.

---

## 9. Unmappable B2B Fields

The following SnapPay fields are B2B/ERP-specific and have no equivalent in CH or Afterpay. They are stored in the adapter configuration layer and not passed downstream:

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
| level3[].commoditycode | Passed to CH, not to Afterpay |
| level3[].unitofmeasure | Passed to CH, not to Afterpay |
| level3[].taxamount | Passed to CH, not to Afterpay (Afterpay has no per-item tax field) |
| level3[].taxrate | Passed to CH, not to Afterpay |

---

## 10. Schema Changes Required on SnapPay

### 10.1 New Payment Mode

Add "AFTERPAY" as a valid `paymentmode` value alongside existing CC, ACH, CASHAPP, KLARNA.

### 10.2 New Response Fields

Add to the SnapPay charge response schema:

```yaml
afterpayCheckoutToken:
  type: string
  description: Afterpay checkout token for auth/capture
afterpayRedirectUrl:
  type: string
  description: URL to redirect customer to Afterpay checkout
```

### 10.3 GetRequestID Enhancement

The GetRequestID response needs new fields for the Afterpay checkout:

```yaml
afterpayCheckoutToken:
  type: string
  description: Checkout token from Afterpay (Phase 1)
afterpayRedirectUrl:
  type: string
  description: URL to redirect customer for Afterpay approval
afterpayCheckoutExpiry:
  type: string
  description: ISO 8601 checkout expiry timestamp
```

### 10.4 New Request Field for Phase 2

Add to the charge request:

```yaml
afterpayCheckoutToken:
  type: string
  description: Checkout token received from Phase 1 GetRequestID response
```

---

## 11. Error Code Mapping

| Afterpay Error | CH Error Code | SnapPay Error Code | HTTP Status | Description |
|---|---|---|---|---|
| INVALID_OBJECT | VALIDATION_ERROR | 4001 | 400 | Invalid request body |
| INVALID_TOKEN | VALIDATION_ERROR | 4002 | 400 | Token invalid or expired |
| NOT_FOUND | RESOURCE_NOT_FOUND | 4041 | 404 | Order not found |
| UNAUTHORIZED | AUTHORIZATION_FAILED | 4031 | 401 | Invalid credentials |
| DECLINED | PAYMENT_DECLINED | 4032 | 403 | Payment declined |
| CAPTURE_NOT_ALLOWED | CAPTURE_FAILED | 4093 | 409 | Not in capturable state |
| REFUND_NOT_ALLOWED | REFUND_FAILED | 4094 | 409 | Not in refundable state |
| VOID_NOT_ALLOWED | CANCEL_FAILED | 4095 | 409 | Already captured |
| SERVER_ERROR | PROVIDER_ERROR | 5021 | 502 | Afterpay internal error |

---

## 12. Regional Configuration

| Region | SnapPay Currency | Afterpay API Base |
|---|---|---|
| US | USD | https://global-api-sandbox.afterpay.com |
| AU | AUD | https://global-api-sandbox.afterpay.com |

---

## 13. Auth Bridging

SnapPay authentication uses API key-based auth. The adapter layer:
1. Validates SnapPay API key at the gateway
2. Maps to CH HMAC credentials for the CH boundary
3. CH maps to HTTP Basic (Base64(username:password)) for the Afterpay boundary
4. Each boundary handles its own auth -- credentials are never passed through

---

## 14. Supported Capabilities Matrix

| Capability | SnapPay Support | CH Support | Afterpay Support | Notes |
|---|---|---|---|---|
| Checkout Init (GetRequestID) | Y | Y | Y | Returns token + redirect URL |
| Auth (Deferred) | Y | Y | Y | POST /v2/payments/auth |
| Immediate Capture | Y | Y | Y | POST /v2/payments/capture |
| Capture after Auth | Y | Y | Y | POST /v2/payments/{orderId}/capture |
| Partial Capture | Y | Y | Y | Amount-based |
| Partial Refund | Y | Y | Y | |
| Void | Y | Y | Y | Before capture only |
