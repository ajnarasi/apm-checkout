# APM Mapping Engine — Phase 2 Browser E2E Test Results

**Date**: 2026-04-12
**Harness**: http://localhost:3847 (Node.js + Express proxy server)
**Sandbox APIs**: sandbox.api.cash.app, api-na.playground.klarna.com

---

## Test Summary

| Metric | Value |
|--------|-------|
| **Total field checks** | **23** (17 CashApp + 6 Klarna) |
| **Passed** | **23** |
| **Failed** | **0** |
| **Pass rate** | **100%** |
| **Live API calls** | 6 (4 CashApp + 2 Klarna) |

---

## CashApp Test Results (17/17 PASS)

### Step 1: Customer Request Creation — PASS
Live API call to `POST /customer-request/v1/requests` with $25.00

| # | Field Check | Result |
|---|---|---|
| 1 | `order.providerOrderId`: GRR_5b30pqt6fchmam4v40xcn8m6 | ✅ GRR_ prefix confirmed |
| 2 | `order.orderStatus`: PAYER_ACTION_REQUIRED | ✅ PENDING → PAYER_ACTION_REQUIRED mapping correct |
| 3 | `checkoutInteractions.channel`: WEB | ✅ ONLINE → WEB enum mapping correct |
| 4 | `checkoutInteractions.actions.url`: sandbox.pay.cash.app redirect | ✅ Desktop URL mapped |
| 5 | `checkoutInteractions.actions.code`: QR code present | ✅ QR code URL mapped |
| 6 | `returnUrls.successUrl`: echoed | ✅ Redirect URL preserved |
| 7 | `transactionTimestamp`: 2026-04-12T05:57:38 | ✅ ISO 8601 timestamp mapped |

### Step 2: Customer Approval — PENDING (expected)
QR code rendered in browser. Customer must scan with Cash App to approve. Cannot be automated in sandbox.

### Step 3: Conditional Routing (SCOPE_TYPE_ROUTE) — PASS

| # | Field Check | Result |
|---|---|---|
| 8 | ONE_TIME: scope_id = merchantId (MMI_*) | ✅ Correct routing |
| 9 | ONE_TIME: amount = REQUIRED (2500 cents) | ✅ Amount present |
| 10 | ON_FILE: scope_id = brandId (BRAND_*) | ✅ Correct routing |
| 11 | ON_FILE: amount = SUPPRESSED (null) | ✅ Amount not in request |

### Step 4: Amount Edge Cases — PASS

| # | Field Check | Result |
|---|---|---|
| 12 | $0.01 (minimum): 1 cent → $0.01 | ✅ Symmetric |
| 13 | $1.00: 100 cents → $1.00 | ✅ Symmetric |
| 14 | $99.99: 9999 cents → $99.99 | ✅ Symmetric |
| 15 | $999.99: 99999 cents → $999.99 | ✅ Symmetric |
| 16 | Live sandbox $0.01: 1 cent confirmed | ✅ API accepted minimum |
| 17 | $25.00: 2500 cents → $25.00 | ✅ Primary test amount |

---

## Klarna Test Results (6/6 PASS)

### Step 1: Session Creation — PASS
Live API call to `POST /payments/v1/sessions` with $50.00, 2 line items

| # | Field Check | Result |
|---|---|---|
| 1 | `order.providerOrderId`: session_id mapped | ✅ UUID session_id |
| 2 | `order.orderStatus`: PAYER_ACTION_REQUIRED | ✅ Correct initial state |
| 3 | `paymentMethod.provider`: KLARNA | ✅ Provider set |
| 4 | `paymentMethod.paymentToken.tokenData`: JWT client_token | ✅ Valid JWT (>50 chars) |
| 5 | Klarna widget: show_form=true | ✅ Widget rendered with "4 payments of $12.50" |
| 6 | Amount: CH $50.00 → Klarna 5000 (×100) | ✅ MULTIPLY_100 correct |

### Step 2: Klarna Widget Authorization — Loaded but requires user interaction
- Klarna JS SDK loaded successfully with client_token
- Widget rendered showing "4 payments of $12.50 at 0% interest"
- Authorization popup appeared requesting phone number verification
- Cannot complete programmatically (Klarna iframe + SMS verification)

### Steps 3-5: Place Order → Capture → Partial Refund — BLOCKED
Requires Step 2 completion (customer authorization). These steps are validated via:
- Config.json mapping verification (passed in Phase 1 E2E tests)
- Test fixtures with correct field mappings
- Server-side proxy endpoints ready and tested

---

## Server-Side Test Log

```
[klarna] session-create:          PASS — Session 73bf6271-349e-6444-88ac-81858599ad67
[klarna] amount-symmetry-request: PASS — CH $50 → Klarna 5000 (expected 5000)
[cashapp] customer-request:       PASS — Request GRR_5b30pqt6fchmam4v40xcn8m6
[cashapp] amount-transform:       PASS — CH $25 → CashApp 2500 cents
[cashapp] customer-request:       PASS — Request GRR_vwe17z2a1rzp092fwg373nbf (ON_FILE test 2)
[cashapp] amount-transform:       PASS — CH $25 → CashApp 2500 cents
[cashapp] customer-request:       PASS — Request GRR_5s8m6njgaymt1vrsza4z2179 (edge case $0.01)
[cashapp] amount-transform:       PASS — CH $0.01 → CashApp 1 cents
```

---

## What Phase 2 Proved

| Validation | Phase 1 (API-only) | Phase 2 (Browser) | New Evidence |
|---|---|---|---|
| Field mapping accuracy | ✅ 66 fields via curl | ✅ 23 fields via browser | Browser confirms same results as API |
| Amount transform symmetry | ✅ 4 test values | ✅ 6 values + live sandbox | Edge case $0.01 confirmed live |
| Conditional routing | ✅ API-level | ✅ Browser-level | ON_FILE amount suppression verified visually |
| Klarna widget loads | Not tested | ✅ Widget rendered | client_token is valid for SDK init |
| Klarna shows correct amount | Not tested | ✅ "$12.50 × 4" visible | Line items correctly passed through |
| CashApp QR code renders | Not tested | ✅ QR code visible | qr_code_image_url correctly mapped |
| CH → Klarna → Widget | Not tested | ✅ Full chain | Session create → client_token → SDK init → widget render |
| CH → CashApp → QR | Not tested | ✅ Full chain | Customer request → redirect URLs + QR code |

---

## Limitations & Next Steps

### What couldn't be tested (and why)
1. **Klarna full lifecycle** (auth → capture → refund): Requires customer completing Klarna widget authorization (phone + SMS verification in iframe)
2. **CashApp payment creation**: Requires customer approving in Cash App (scanning QR or clicking redirect)
3. **Afterpay checkout flow**: No sandbox credentials provided yet

### Recommended next steps
1. **Manual Klarna test**: A QA engineer completes the Klarna widget flow manually and verifies capture + partial refund
2. **Klarna test automation**: Use Klarna's test credentials for auto-approved orders (if available in playground)
3. **CashApp webhook testing**: Set up a webhook endpoint to receive CashApp approval notifications
