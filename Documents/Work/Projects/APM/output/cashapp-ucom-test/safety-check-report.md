# CashApp Safety Check Report

> **Commerce Hub Version**: 1.26.0302
> **CashApp Provider API Version**: v2
> **Ucom Version**: 0.2.3
> **Generated**: 2026-04-11
> **Template**: redirect-wallet-v1
> **Golden Mapping Source**: tech-lead-manual-mapping + sandbox-validated
> **Platform Filter**: `--platform ucom`

---

## Check Results

| Check | Status | Details |
|---|---|---|
| Amount Symmetry | PASS | Request: MULTIPLY_100 (x100). Response: DIVIDE_100 (/100). Transforms are symmetric. A Commerce Hub decimal value of 15.10 becomes 1510 cents on the CashApp side, and 1510 cents in the response converts back to 15.10. No precision loss. |
| Currency Preservation | PASS | `amount.currency` uses PASSTHROUGH in both request and response directions. The ISO-4217 currency code is never modified during transit. |
| ID Uniqueness | PASS_WITH_NOTE | `transactionProcessingDetails.transactionId` maps to three CashApp fields: `reference_id`, `idempotency_key`, and `refund.reference_id`. Each serves a distinct purpose (reference tracking, idempotency enforcement, and refund correlation). No ambiguity at runtime because each target field exists in a separate API call context. |
| Tier 1 Coverage | PASS | All Tier 1 fields are mapped: `amount.total`, `amount.currency`, `transactionDetails.operationType`, `transactionProcessingDetails.transactionId`, `paymentReceipt.processorResponseDetails.referenceNumber`, `paymentReceipt.approvedAmount.total`, `order.orderStatus`, `order.providerOrderId`. |
| Bidirectional Completeness | PASS | Request `amount.total` (MULTIPLY_100) is paired with response `approvedAmount.total` (DIVIDE_100). Request `transactionId` (PASSTHROUGH) is paired with response `referenceNumber` (PASSTHROUGH). All critical fields have round-trip coverage. |
| Return URL Validation | PASS | `checkoutInteractions.returnUrls.successUrl` is mapped to `request.redirect_url`. CashApp uses a single `redirect_url` for all outcomes. Success and cancellation are determined by callback query parameters appended by CashApp, not by separate URLs. |

---

## Summary

| Metric | Value |
|---|---|
| **Overall Result** | **PASS** |
| Auto-remediation | None needed |
| Fields flagged for human review | 0 |
| Checks executed | 6 |
| Checks passed | 5 PASS, 1 PASS_WITH_NOTE |
| Checks failed | 0 |
