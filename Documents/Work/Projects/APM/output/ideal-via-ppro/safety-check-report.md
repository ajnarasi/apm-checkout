# iDEAL via PPRO -- Safety Check Report

```yaml
commerceHubVersion: 1.26.0302
providerApiVersion: PPRO v1
aggregator: PPRO
targetApm: iDEAL
ucomVersion: 0.2.3
snappayVersion: 3.0.9
generatedAt: 2026-04-12T07:02:00Z
patternTemplate: bank-redirect-v1
goldenMappingSource: "NONE -- generated from sandbox discovery"
confidence: generated
safetyChecksPassed: true
sandboxValidated: true
```

---

## Overall Result: PASS

All six safety checks passed. No blocking issues identified.

**Confidence note**: This mapping was generated from sandbox discovery, not derived from a golden mapping source. All field paths were validated against the live PPRO sandbox at `https://api.sandbox.eu.ppro.com` on 2026-04-12 with actual successful iDEAL, Bancontact, and Pix charge creations. The "generated" confidence level means these mappings should be reviewed by the Commerce Hub integration team before production deployment.

---

## Check Results

| # | Check | Status | Details |
|---|---|---|---|
| 1 | Amount Symmetry | PASS | All monetary fields use MULTIPLY_100 on request and DIVIDE_100 on response. Verified across auth (amount.value / authorizations[0].amount), capture (amount.value / captures[0].amount), and refund (amount.value / refunds[0].amount). Round-trip is lossless for two-decimal currencies. |
| 2 | Currency Preservation | PASS | `amount.currency` uses PASSTHROUGH transform. No currency conversion, truncation, or modification occurs. ISO-4217 "EUR" passes through unchanged from CH to PPRO and back. |
| 3 | ID Uniqueness | PASS | Each PPRO identifier maps to exactly one Commerce Hub field with no fan-out. `id` (charge_*) maps exclusively to `transactionProcessingDetails.transactionId`. `authorizations[0].id` maps exclusively to `paymentReceipt.processorResponseDetails.referenceNumber`. `captures[0].id` and `refunds[0].id` each map exclusively to `paymentReceipt.processorResponseDetails.referenceNumber` (scoped to their respective capability). |
| 4 | Tier 1 Coverage | PASS | All Tier 1 fields are mapped: amount.value, amount.currency, consumer.name, consumer.email, consumer.country, paymentMethod, authenticationSettings (returnUrl + type), merchantPaymentChargeReference. No line items required for bank redirect pattern. |
| 5 | Bidirectional Completeness | PASS | Every request amount field has a corresponding response amount field. `amount.value` (request) pairs with `authorizations[0].amount` (response). `captures amount.value` (request) pairs with `captures[0].amount` (response). `refunds amount.value` (request) pairs with `refunds[0].amount` (response). `merchantPaymentChargeReference` passes through to response. Auth creates chargeId + redirectUrl. |
| 6 | Return URL Validation | PASS | Bank redirect pattern: `checkoutInteractions.returnUrls.successUrl` maps to `authenticationSettings[0].settings.returnUrl`. PPRO returns the redirect URL in `authenticationMethods[0].details.requestUrl`. The customer is redirected to the bank and back to the merchant returnUrl after authentication. URL is present and non-empty in sandbox response. |

---

## Amount Symmetry Detail

| Capability | Request Field | Request Transform | Response Field | Response Transform | Symmetric |
|---|---|---|---|---|---|
| Auth (Create Charge) | amount.value | MULTIPLY_100 | authorizations[0].amount | DIVIDE_100 | Yes |
| Capture | amount.value | MULTIPLY_100 | captures[0].amount | DIVIDE_100 | Yes |
| Refund | amount.value | MULTIPLY_100 | refunds[0].amount | DIVIDE_100 | Yes |
| Void | (no amount) | -- | (no amount) | -- | N/A |

---

## ID Mapping Detail

| PPRO ID | CH Target Field | Fan-Out Count | Status |
|---|---|---|---|
| id (charge_*) | transactionProcessingDetails.transactionId | 1 | PASS |
| instrumentId | paymentMethod.paymentToken.tokenData | 1 | PASS |
| authorizations[0].id | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |
| captures[0].id | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |
| refunds[0].id | paymentReceipt.processorResponseDetails.referenceNumber | 1 | PASS |

> `authorizations[0].id`, `captures[0].id`, and `refunds[0].id` map to the same CH field path but are scoped to different capabilities (auth vs. capture vs. refund). They never coexist as the "current" processor reference in a single response context.

---

## Return URL Validation Detail

| Property | Value | Status |
|---|---|---|
| CH request field | checkoutInteractions.returnUrls.successUrl | Mapped |
| PPRO request field | authenticationSettings[0].settings.returnUrl | Mapped |
| PPRO response field | authenticationMethods[0].details.requestUrl | Present |
| Redirect method | GET | Confirmed |
| Sandbox redirect URL present | Yes | PASS |

---

## Aggregator-Specific Safety Notes

1. **PPRO paymentMethod uppercase enforcement**: The `paymentMethod` field MUST be uppercase ("IDEAL"). The MAP_ENUM + UPPER transform ensures this. Lowercase values are rejected by PPRO. This was validated in sandbox.

2. **HATEOAS links not exposed**: PPRO returns `_links` for captures, refunds, and voids. These are consumed internally by Commerce Hub. There is no risk of merchants receiving or using stale HATEOAS links because they are stripped at the CH boundary.

3. **No line item integrity check needed**: Unlike Klarna BNPL, iDEAL bank redirect does not require line items. The line item integrity safety check is N/A for this pattern.

4. **Generated confidence**: All mappings carry "confidence": "generated" because no golden mapping exists for PPRO. Field paths were discovered through sandbox interaction. Production deployment should include a review pass by the Commerce Hub integration team.
