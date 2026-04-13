# Afterpay BNPL -- Safety Check Report

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

## Overall Result: PASS

All six safety checks passed. No blocking issues identified. All mappings have confidence level "generated" and require human verification before production deployment.

---

## Check Results

| # | Check | Status | Details |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | All monetary fields use NUMBER_TO_STRING on request and STRING_TO_NUMBER on response. Verified across auth (amount.amount), capture (amount.amount), and refund (amount.amount). Round-trip is lossless: CH 50.00 (number) -> Afterpay "50.00" (string) -> CH 50.00 (number). Unlike Klarna (MULTIPLY_100/DIVIDE_100), no multiplication or division occurs -- only type conversion between number and string decimal. |
| 2 | Currency Preservation | PASS | `amount.currency` uses PASSTHROUGH transform in all directions. No currency conversion, truncation, or modification occurs. ISO-4217 codes pass through unchanged. Both the order-level currency and per-item `items[].price.currency` are preserved. |
| 3 | ID Uniqueness | PASS | Each Afterpay identifier maps to exactly one Commerce Hub field with no fan-out. `token` maps exclusively to `paymentMethod.paymentToken.tokenData`. `id` (orderId) maps exclusively to `transactionProcessingDetails.transactionId`. `refundId` maps exclusively to `paymentReceipt.processorResponseDetails.referenceNumber`. |
| 4 | Tier 1 Coverage | PASS | All Tier 1 fields are mapped, including BNPL-promoted fields: `orderData.itemDetails[]` (name, quantity, price as Money object), `shippingAddress` (name, line1, area1, region, postcode, countryCode), `billingAddress` (same structure), `customer.email`, `customer.firstName`, `customer.lastName`, and `checkoutInteractions.returnUrls` (redirectConfirmUrl, redirectCancelUrl). |
| 5 | Bidirectional Completeness | PASS | Every request amount field has a corresponding response amount field. `amount.amount` (checkout request) pairs with `originalAmount.amount` (auth/capture response). `amount.amount` (refund request) pairs with `amount.amount` (refund response). `merchantReference` passes through bidirectionally. Checkout creation returns `token` + `redirectCheckoutUrl`. Auth returns `id` (orderId) + `status`. |
| 6 | Return URL Validation | PASS | Afterpay uses redirect-based checkout (unlike Klarna's embedded widget). Both `merchant.redirectConfirmUrl` and `merchant.redirectCancelUrl` are mapped from Commerce Hub's `checkoutInteractions.returnUrls.successUrl` and `cancelUrl` respectively. Both are Tier 1 required fields. |

---

## Amount Symmetry Detail

| Capability | Request Field | Request Transform | Response Field | Response Transform | Symmetric |
|---|---|---|---|---|---|
| Auth (Checkout) | amount.amount | NUMBER_TO_STRING | originalAmount.amount | STRING_TO_NUMBER | Yes |
| Capture | amount.amount | NUMBER_TO_STRING | originalAmount.amount | STRING_TO_NUMBER | Yes |
| Refund | amount.amount | NUMBER_TO_STRING | amount.amount | STRING_TO_NUMBER | Yes |
| Void | (no amount) | -- | (no amount in request) | -- | N/A |

### Amount Transform Comparison: Afterpay vs. Klarna

| Property | Klarna (Template) | Afterpay (Generated) |
|---|---|---|
| Request transform | MULTIPLY_100 (50.00 -> 5000) | NUMBER_TO_STRING (50.00 -> "50.00") |
| Response transform | DIVIDE_100 (5000 -> 50.00) | STRING_TO_NUMBER ("50.00" -> 50.00) |
| Risk of precision loss | Low (integer arithmetic) | Low (string preserves decimal places) |
| Edge case | Currencies with non-2 decimal places | Trailing zeros must be preserved |

---

## ID Mapping Detail

| Afterpay ID | CH Target Field | Fan-Out Count | Status |
|---|---|---|---|
| token | paymentMethod.paymentToken.tokenData | 1 | PASS |
| id (orderId) | transactionProcessingDetails.transactionId | 1 | PASS |
| refundId | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |
| redirectCheckoutUrl | checkoutInteractions.actions.url | 1 | PASS |

> No fan-out detected. Each Afterpay identifier maps to exactly one Commerce Hub field.

---

## Return URL Validation Detail

| URL Type | CH Field | Afterpay Field | Direction | Status |
|---|---|---|---|---|
| Success/Confirm | checkoutInteractions.returnUrls.successUrl | merchant.redirectConfirmUrl | CH to Afterpay | PASS |
| Cancel | checkoutInteractions.returnUrls.cancelUrl | merchant.redirectCancelUrl | CH to Afterpay | PASS |

> This check is N/A for Klarna (widget-based) but PASS for Afterpay (redirect-based). This validates that the BNPL template correctly adapts to redirect-based checkout flows.

---

## String Decimal Consistency Check (Afterpay-Specific)

This additional check verifies that the NUMBER_TO_STRING and STRING_TO_NUMBER transforms produce consistent results.

| Input (CH) | Transform | Output (Afterpay) | Reverse Transform | Output (CH) | Lossless |
|---|---|---|---|---|---|
| 50.00 | NUMBER_TO_STRING | "50.00" | STRING_TO_NUMBER | 50.00 | Yes |
| 20.00 | NUMBER_TO_STRING | "20.00" | STRING_TO_NUMBER | 20.00 | Yes |
| 10.00 | NUMBER_TO_STRING | "10.00" | STRING_TO_NUMBER | 10.00 | Yes |
| 0.01 | NUMBER_TO_STRING | "0.01" | STRING_TO_NUMBER | 0.01 | Yes |

**Implementation note**: The NUMBER_TO_STRING transform must ensure exactly two decimal places are output (e.g., 50 must become "50.00", not "50"). The STRING_TO_NUMBER transform must parse the string as a floating-point number. Both transforms should be tested with edge cases including zero amounts, single-cent amounts, and large amounts.
