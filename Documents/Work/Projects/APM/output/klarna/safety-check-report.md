# Klarna BNPL -- Safety Check Report

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

## Overall Result: PASS

All six safety checks passed. No blocking issues identified.

---

## Check Results

| # | Check | Status | Details |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | All monetary fields use MULTIPLY_100 on request and DIVIDE_100 on response. Verified across auth (order_amount / order_amount), capture (captured_amount / captured_amount), and refund (refunded_amount / refunded_amount). Round-trip is lossless for two-decimal currencies. |
| 2 | Currency Preservation | PASS | `purchase_currency` uses PASSTHROUGH transform. No currency conversion, truncation, or modification occurs at any point in the mapping. ISO-4217 codes pass through unchanged. |
| 3 | ID Uniqueness | PASS | Each Klarna identifier maps to exactly one Commerce Hub field with no fan-out. `order_id` maps exclusively to `transactionProcessingDetails.transactionId`. `session_id` maps exclusively to `order.providerOrderId`. `capture_id` and `refund_id` each map exclusively to `paymentReceipt.processorResponseDetails.referenceNumber` (scoped to their respective capability). |
| 4 | Tier 1 Coverage | PASS | All Tier 1 fields are mapped, including BNPL-promoted fields: `orderData.itemDetails[]` (name, quantity, unit_price, total_amount, total_tax_amount), `shippingAddress` (given_name, family_name, street, city, postal_code, country), `billingAddress` (same structure), and `customer.email`. |
| 5 | Bidirectional Completeness | PASS | Every request amount field has a corresponding response amount field. `order_amount` (request) pairs with `order_amount` in session read. `captured_amount` (request) pairs with `captured_amount` (response). `refunded_amount` (request) pairs with `refunded_amount` (response). `merchant_reference1` passes through to response. Session creation returns `session_id` + `client_token`. Place order returns `order_id` + `fraud_status`. |
| 6 | Return URL Validation | N/A | Server-to-Server BNPL pattern. No redirect URLs are used. Customer interaction occurs via the embedded Klarna JS SDK widget, not browser redirect. This check does not apply. |

---

## Amount Symmetry Detail

| Capability | Request Field | Request Transform | Response Field | Response Transform | Symmetric |
|---|---|---|---|---|---|
| Auth (Session) | order_amount | MULTIPLY_100 | order_amount (session read) | DIVIDE_100 | Yes |
| Capture | captured_amount | MULTIPLY_100 | captured_amount | DIVIDE_100 | Yes |
| Partial Refund | refunded_amount | MULTIPLY_100 | refunded_amount | DIVIDE_100 | Yes |
| Cancel | (no amount) | -- | (no amount) | -- | N/A |

---

## ID Mapping Detail

| Klarna ID | CH Target Field | Fan-Out Count | Status |
|---|---|---|---|
| session_id | order.providerOrderId | 1 | PASS |
| client_token | paymentMethod.paymentToken.tokenData | 1 | PASS |
| order_id | transactionProcessingDetails.transactionId | 1 | PASS |
| capture_id | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |
| refund_id | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |

> `capture_id` and `refund_id` map to the same CH field path but are scoped to different capabilities (capture vs. refund). They never coexist in a single response.
