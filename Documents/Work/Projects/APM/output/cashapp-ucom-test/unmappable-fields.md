# CashApp Unmappable Fields

> **Commerce Hub Version**: 1.26.0302
> **CashApp Provider API Version**: v2
> **Ucom Version**: 0.2.3
> **Generated**: 2026-04-11
> **Template**: redirect-wallet-v1
> **Golden Mapping Source**: tech-lead-manual-mapping + sandbox-validated
> **Platform Filter**: `--platform ucom`

---

## CashApp Fields With No Commerce Hub Equivalent

These fields exist in CashApp responses but have no corresponding field in the Commerce Hub schema.

| CashApp Field | Type | Business Context | Recommended Resolution |
|---|---|---|---|
| `request.expires_at` | string (ISO 8601) | Customer Request expiry time. Default is 1 hour from creation. After expiry, the customer can no longer approve the request. | Store in Commerce Hub custom fields or logging infrastructure. Useful for monitoring abandoned payment flows. Do not surface to merchant unless explicitly requested. |
| `request.origin.type` | string ("DIRECT") | CashApp-specific origin tracking that indicates how the Customer Request was created. Always "DIRECT" for API-initiated requests. | Informational only. Do not map. This value is internal to CashApp and has no merchant-facing relevance. |
| `auth_flow_triggers.refreshes_at` | string (ISO 8601) | Indicates when the QR code image URL will expire and need to be refreshed. Relevant only for scan-to-pay flows. | Internal to CashApp. Do not map. The connector should handle QR refresh logic transparently if implementing long-lived QR display. |
| `payment.account_ref_id` | string | Required for ON_FILE_PAYMENT flows only. Links the payment to a stored customer account reference within CashApp. | No direct Commerce Hub field exists. Populate from boarding configuration when `payment_type` = ON_FILE_PAYMENT. The value must be resolved through merchant configuration lookup at runtime. |

---

## Commerce Hub Fields With No CashApp Equivalent

These fields exist in the Commerce Hub request schema but have no corresponding target in the CashApp API.

| CH Field | Type | Business Context | Resolution |
|---|---|---|---|
| `merchantDetails.storeId` | string | Commerce Hub store identifier used for multi-location merchant routing and reporting. | Not passed to CashApp. CashApp uses `scope_id` (resolved to either `merchantId` or `brandId` from boarding config) instead of store-level identifiers. |
| `merchantDetails.terminalId` | string | Commerce Hub terminal identifier for card-present transaction tracking. | Not applicable. CashApp is a card-not-present (CNP) wallet. Terminal identifiers have no meaning in redirect-based wallet flows. |
| `customer.firstName` / `customer.lastName` | string | Customer identity fields used in Commerce Hub for fraud scoring and receipt generation. | CashApp manages customer identity internally through the CashApp account. Customer name is not accepted or required in the payment request payload. |
| `billingAddress` | object | Full billing address object including street, city, state, postal code, and country. | CashApp does not require or accept billing address information. Address verification is handled within the CashApp platform. |
| `dynamicDescriptors.mcc` | string | Merchant Category Code used for transaction classification on card network statements. | CashApp does not accept MCC in the payment request. Merchant category is configured during the boarding process through the CashApp brand profile. |

---

## Ucom-Specific Gaps

These are fields relevant to the Ucom adapter layer that require attention.

| Ucom Field | Gap Type | Resolution |
|---|---|---|
| `authorization.fundingSource.cashApp.redirectUrl` | NEW field (response only) | Must be added to Ucom schema. Populated from `checkoutInteractions.actions.url` in CH response. |
| `authorization.fundingSource.cashApp.qrCodeUrl` | NEW field (response only) | Must be added to Ucom schema. Populated from `checkoutInteractions.actions.code` in CH response. |
| `authorization.providerOrderId` | NEW field (response only) | Must be added to Ucom schema. Populated from `order.providerOrderId` (GRR_ prefix). |
| `Auth-Token-Type` header | Missing in Ucom requests | Adapter must inject `Auth-Token-Type: HMAC` when bridging to Commerce Hub. Not a schema change; handled in adapter logic. |

---

## Notes

SnapPay B2B unmappable fields are not included in this report. This run was filtered with `--platform ucom`. Re-run with `--platform snappay` to include SnapPay-specific unmappable fields (9 B2B fields including `companycode`, `branchplant`, `ordertype`, `supplier{}`, `clxstream[]`, `level3[]`, `user.forcepasswordreset`, `user.forcetermsandconditions`, `adderpcustomerinsnappay`).
