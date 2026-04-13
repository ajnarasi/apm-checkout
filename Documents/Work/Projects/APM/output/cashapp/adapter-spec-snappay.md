# SnapPay -> Commerce Hub Adapter Specification: CashApp

> **APM:** CashApp (Cash App Pay)
> **Pattern:** redirect-wallet-v1
> **Commerce Hub Version:** 1.26.0302
> **SnapPay Version:** 3.0.9
> **Generated:** 2026-04-12T04:52:00Z
> **Mapping Source:** tech-lead-manual-mapping

---

## 1. Domain Translation

SnapPay is a B2B payment platform. Its domain model differs significantly from Commerce Hub's consumer payment model. Key translations:

| Concept | SnapPay Term | CH Term | Translation Rule |
|---|---|---|---|
| Transaction type | `transactiontype`: "S" (Sale) | `transactionDetails.operationType`: "CAPTURE" | S-->CAPTURE, A-->AUTHORIZE |
| Payment mode | `paymentmode`: "CC" or "ACH" | `paymentMethod.provider`: "CASHAPP" | NEW mode needed: "CASHAPP" |
| Amount | `transactionamount`: 100.25 (decimal) | `amount.total`: 100.25 (decimal) | NONE -- both use decimal |
| Currency | `currencycode`: "USD" | `amount.currency`: "USD" | PASSTHROUGH |
| Merchant | `payments[0].merchantid` | `merchantDetails.merchantId` | PASSTHROUGH |
| Customer ID | `customerid` | `customer.merchantCustomerId` | PASSTHROUGH |
| Redirect | `redirecturl` | `checkoutInteractions.returnUrls.successUrl` | PASSTHROUGH |
| Invoice | `invoiceid` | `transactionDetails.merchantInvoiceNumber` | PASSTHROUGH |
| Order | `orderid` | `transactionDetails.merchantOrderId` | PASSTHROUGH |

---

## 2. Endpoint Mapping

| SnapPay Endpoint | Direction | CH Endpoint | Notes |
|---|---|---|---|
| `POST /api/interop/v3/GetRequestID` | --> | `POST /checkouts/v1/orders` (auth) | Initializes payment session |
| `POST /api/interop/v3/charge` | --> | `POST /checkouts/v1/orders` (capture) | Auth + capture combined |
| `POST /api/interop/v3/refund` | --> | `POST /checkouts/v1/orders` (refund) | Refund operation |

---

## 3. Field Mapping: Auth/Init Request (SnapPay --> Commerce Hub)

| # | SnapPay Field | SnapPay Type | Direction | CH Field | CH Type | Transform | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `transactionamount` | number (decimal) | --> | `amount.total` | number (decimal) | NONE | Both use decimal format |
| 2 | `currencycode` | string (ISO-4217) | --> | `amount.currency` | string | PASSTHROUGH | |
| 3 | `payments[0].merchantid` | string | --> | `merchantDetails.merchantId` | string | PASSTHROUGH | |
| 4 | `paymentmode` | string | --> | `paymentMethod.provider` | string | MAP_ENUM | "CASHAPP"-->"CASHAPP" (new enum value) |
| 5 | `customerid` | string | --> | `customer.merchantCustomerId` | string | PASSTHROUGH | |
| 6 | `redirecturl` | string (URL) | --> | `checkoutInteractions.returnUrls.successUrl` | string | PASSTHROUGH | |
| 7 | `invoiceid` | string | --> | `transactionDetails.merchantInvoiceNumber` | string | PASSTHROUGH | |
| 8 | `orderid` | string | --> | `transactionDetails.merchantOrderId` | string | PASSTHROUGH | |
| 9 | `transactiontype` | string ("S"/"A") | --> | `transactionDetails.operationType` | string | MAP_ENUM | S-->CAPTURE, A-->AUTHORIZE |
| 10 | `[header] accountid` | string | --> | `[header] Api-Key` | string | MAP/BRIDGE | Credential lookup required |

---

## 4. Field Mapping: Auth/Init Response (Commerce Hub --> SnapPay)

| # | CH Field | CH Type | Direction | SnapPay Field | SnapPay Type | Transform | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `transactionProcessingDetails.transactionId` | string | --> | `transactions.pgtransactionid` | string | PASSTHROUGH | |
| 2 | `paymentReceipt.approvedAmount.total` | number | --> | `transactions.transactionamount` | number | NONE | |
| 3 | `amount.currency` | string | --> | `transactions.currency` | string | PASSTHROUGH | |
| 4 | `gatewayResponse.transactionState` | string | --> | `status` | string | MAP_ENUM | AUTHORIZED-->"Y", DECLINED-->"N", PAYER_ACTION_REQUIRED-->"PENDING" |
| 5 | `paymentReceipt.processorResponseDetails.referenceNumber` | string | --> | `transactions.authorizationcode` | string | PASSTHROUGH | |
| 6 | `order.providerOrderId` | string | --> | `transactions.paymenttransactionid` | string | PASSTHROUGH | |
| 7 | `checkoutInteractions.actions.url` | string | --> | `[NEW] redirecturl` | string | PASSTHROUGH | CashApp customer redirect URL |
| 8 | `checkoutInteractions.actions.code` | string | --> | `[NEW] qrcodeurl` | string | PASSTHROUGH | QR code URL for scan-to-pay |
| 9 | `transactionProcessingDetails.transactionTimestamp` | string | --> | `transactions.transactiondate` | string | FORMAT | ISO-8601 to SnapPay date format |
| 10 | `order.orderStatus` | string | --> | `status` | string | MAP_ENUM | Supplements gatewayResponse mapping |
| 11 | `gatewayResponse.transactionProcessingDetails.orderId` | string | --> | `transactions.orderid` | string | PASSTHROUGH | |

---

## 5. Capture (Charge) Request Mapping

| # | SnapPay Field | Direction | CH Field | Transform | Notes |
|---|---|---|---|---|---|
| 1 | `transactionamount` | --> | `amount.total` | NONE | |
| 2 | `currencycode` | --> | `amount.currency` | PASSTHROUGH | |
| 3 | `pgtransactionid` (from prior auth) | --> | `referenceTransactionDetails.referenceTransactionId` | PASSTHROUGH | Links to original auth |
| 4 | `payments[0].merchantid` | --> | `merchantDetails.merchantId` | PASSTHROUGH | |
| 5 | `transactiontype` | --> | `transactionDetails.operationType` | MAP_ENUM | Always "CAPTURE" |

**Capture Response:** Same as auth response mapping above.

---

## 6. Refund Request Mapping

| # | SnapPay Field | Direction | CH Field | Transform | Notes |
|---|---|---|---|---|---|
| 1 | `transactionamount` | --> | `amount.total` | NONE | Partial refund supported |
| 2 | `currencycode` | --> | `amount.currency` | PASSTHROUGH | |
| 3 | `pgtransactionid` (from prior charge) | --> | `referenceTransactionDetails.referenceTransactionId` | PASSTHROUGH | Links to original charge |
| 4 | `payments[0].merchantid` | --> | `merchantDetails.merchantId` | PASSTHROUGH | |

**Refund Response:** Same as auth response mapping, with `status` --> "Y" (success) or "N" (failure).

---

## 7. Auth Bridging

SnapPay uses `AccountID` + `MerchantID` + HMAC headers. Commerce Hub uses `Api-Key` + `Timestamp` + `Auth-Token-Type` + HMAC `Authorization`.

**Adapter responsibilities:**

1. Map SnapPay `accountid` header to CH `Api-Key` (credential lookup from vault required)
2. Generate `Timestamp` header (epoch milliseconds) -- SnapPay does not send this
3. Add `Auth-Token-Type: HMAC` header (not present in SnapPay)
4. Generate `Client-Request-Id` header for end-to-end traceability
5. Recompute HMAC signature using CH credentials and CH request body

**HMAC computation for CH:**
```
Message = Api-Key + Client-Request-Id + Timestamp + RequestBody
Signature = Base64(HMAC-SHA256(Message, ApiSecret))
Authorization = Signature
```

---

## 8. Unmappable B2B Fields

These SnapPay fields have NO Commerce Hub equivalent and require specific handling:

| SnapPay Field | Type | Business Context | Resolution |
|---|---|---|---|
| `companycode` | string | ERP company code | Store in adapter config -- not passed to CH |
| `branchplant` | string | ERP organizational unit | Store in adapter config -- not passed to CH |
| `ordertype` (SO, PO) | string | ERP document type | Ignore -- CH uses intent (AUTHORIZE/CAPTURE) |
| `supplier{}` | object | B2B supplier info | Not applicable for consumer APM -- ignore entirely |
| `clxstream[]` | array | GL coding / reporting | Not applicable -- SnapPay handles internally |
| `level3[]` | array | L3 line item detail | Map to `orderData.itemDetails[]` if present (partial mapping possible) |
| `user.forcepasswordreset` | string | SnapPay user management | Not applicable for payment flow |
| `user.forcetermsandconditions` | string | SnapPay user management | Not applicable for payment flow |
| `adderpcustomerinsnappay` | string | ERP customer sync | Not applicable -- internal to SnapPay |

**level3 partial mapping (best effort):**

| SnapPay level3 Field | Direction | CH orderData.itemDetails Field | Notes |
|---|---|---|---|
| `level3[].description` | --> | `itemDetails[].description` | PASSTHROUGH |
| `level3[].quantity` | --> | `itemDetails[].quantity` | PASSTHROUGH |
| `level3[].unitprice` | --> | `itemDetails[].unitPrice` | NONE |
| `level3[].totalamount` | --> | `itemDetails[].totalAmount` | NONE |
| `level3[].productcode` | --> | `itemDetails[].commodityCode` | PASSTHROUGH |

---

## 9. Schema Changes Required on SnapPay

### 9a. Enum Addition
Add `"CASHAPP"` as a valid `paymentmode` value (alongside existing: CC, ACH, DEBIT).

### 9b. New Response Fields
Add CashApp-specific response fields to the transaction response object:

```json
{
  "transactions": {
    "pgtransactionid": "...",
    "transactionamount": 100.25,
    "currency": "USD",
    "status": "PENDING",
    "redirecturl": "https://cash.app/pay/...",
    "qrcodeurl": "https://cash.app/qr/..."
  }
}
```

- `redirecturl` (string): Customer redirect URL for CashApp approval (response only)
- `qrcodeurl` (string): QR code URL for scan-to-pay (response only)

---

## 10. Error Code Mapping

| CH Error Code | CH HTTP Status | Direction | SnapPay Status | SnapPay HTTP Status |
|---|---|---|---|---|
| `INVALID_REQUEST` | 400 | --> | `status: "E"`, `message: "Bad Request"` | 400 |
| `AUTHENTICATION_ERROR` | 401 | --> | `status: "E"`, `message: "Unauthorized"` | 401 |
| `RESOURCE_NOT_FOUND` | 404 | --> | `status: "E"`, `message: "Not Found"` | 404 |
| `GATEWAY_ERROR` | 500 | --> | `status: "E"`, `message: "Server Error"` | 500 |
| `PROVIDER_TIMEOUT` | 504 | --> | `status: "E"`, `message: "Server Error"` | 500 |
| `VALIDATION_ERROR` | 422 | --> | `status: "E"`, `message: "Validation Failed"` | 422 |

---

## 11. Redirect Wallet Lifecycle (CashApp via SnapPay)

```
1. SnapPay client --> POST /api/interop/v3/GetRequestID (with paymentmode=CASHAPP)
2. Adapter translates --> POST /checkouts/v1/orders (AUTHORIZE)
3. CH returns PAYER_ACTION_REQUIRED + redirect URL + QR code URL
4. Adapter translates response --> status=PENDING + redirecturl + qrcodeurl
5. SnapPay client redirects customer to CashApp (or displays QR code)
6. Customer approves in CashApp
7. CashApp redirects customer back to merchant redirecturl
8. SnapPay client --> POST /api/interop/v3/charge (captures the approved payment)
9. Adapter translates --> POST /checkouts/v1/orders (CAPTURE with referenceTransactionId)
10. CH returns CAPTURED --> Adapter returns status="Y"
```

**Note:** Unlike Ucom which supports separate auth/capture, SnapPay's typical flow combines init (GetRequestID) + charge. The adapter must bridge this difference by maintaining state between the two calls.

---

## 12. Observability Requirements

- Log all field transforms with correlation ID (generated `Client-Request-Id`)
- Emit metrics: `snappay.cashapp.init.latency`, `snappay.cashapp.charge.success_rate`
- Alert on credential lookup failures (indicates misconfigured accountid-->Api-Key mapping)
- Track unmappable field occurrences: `snappay.cashapp.unmapped_fields.count`
- Track redirect completion rate: `snappay.cashapp.redirect.completion_rate`
