# Safety Check Report — Alipay+

| Check | Status | Details |
|---|---|---|
| Amount Symmetry | PASS | Request: DECIMAL_TO_STRING_CENTS (500.00 to "50000"). Response: STRING_CENTS_TO_DECIMAL ("50000" to 500.00). Symmetric via string conversion. |
| Currency Preservation | PASS | paymentAmount.currency uses PASSTHROUGH. No modification. |
| ID Uniqueness | PASS | paymentRequestId maps to merchantOrderId only. paymentId maps to transactionId only. No fan-out. |
| Tier 1 Coverage | PASS | All Tier 1 fields mapped: amount, currency, merchantOrderId, merchantId, paymentMethodType, channel, returnUrl, transactionId, transactionState, approvedAmount |
| Bidirectional Completeness | PASS | Request paymentAmount paired with response paymentAmount. Request paymentRequestId paired with response paymentId. |
| Return URL Validation | PASS | paymentRedirectUrl mapped from returnUrls.successUrl. normalUrl returned in response for redirect flow. |

**Overall: PASS**
Auto-remediation: None needed
Fields flagged for human review: 0

**Note on Amount Transform**: Unlike Klarna (MULTIPLY_100 integer) or PPRO (MULTIPLY_100 integer), Alipay+ uses STRING minor units. The transform chain is: CH decimal (500.00) to multiply by 100 to convert to string ("50000") on request, and parse string to integer to divide by 100 on response. The symmetry is maintained despite the different data type.
