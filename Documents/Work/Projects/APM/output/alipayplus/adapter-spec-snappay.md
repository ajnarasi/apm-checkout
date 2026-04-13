# SnapPay - Commerce Hub Adapter Specification for Alipay+

> Generated: 2026-04-12 | Pattern: qr-code | Commerce Hub: 1.26.0302 | SnapPay: 3.0.9 | Provider: Alipay+ (Direct)

---

## Domain Translation

| SnapPay Field | CH Field | Notes |
|---|---|---|
| transactionamount | amount.total | Both decimal |
| currencycode | amount.currency | PASSTHROUGH |
| customerid | customer.merchantCustomerId | |
| redirecturl | checkoutInteractions.returnUrls.successUrl | |

## Unmappable B2B Fields

| SnapPay Field | Resolution |
|---|---|
| companycode | Store in adapter config |
| branchplant | Store in adapter config |
| supplier{} | Not applicable |
| clxstream[] | Not applicable |

## Schema Changes

Add `ALIPAYPLUS` as valid paymentmode value. Add response fields: `walletType`, `normalUrl`, `pspId`.
