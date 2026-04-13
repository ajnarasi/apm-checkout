# Afterpay BNPL -- Unmappable Fields

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

## Afterpay Fields With No Commerce Hub Equivalent

These Afterpay response or configuration fields have no corresponding field in the Commerce Hub schema. They are available from Afterpay but cannot be stored or forwarded through Commerce Hub without schema extension.

| Afterpay Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| expires | string (ISO 8601) | Auth (Checkout) | Checkout session expiry timestamp. Indicates when the checkout token becomes invalid if the customer has not completed authorization. | Log for monitoring and alerting. Consider surfacing to merchant via out-of-band notification. Not required for transaction processing. |
| events[] | array of objects | Auth, Capture, Refund, Void | Payment event log containing timestamped records of all state transitions (AUTH_APPROVED, CAPTURED, REFUNDED, VOIDED). Each event includes type, created timestamp, and amount. | Log for audit trail and reconciliation reporting. No Commerce Hub equivalent for a per-transaction event stream. Consider future CH schema extension for event history. |
| agreements[] | array of objects | Auth (Checkout) | Afterpay terms and conditions acceptance tracking. Records which agreements the consumer accepted during checkout. | Not required for transaction processing. Afterpay manages agreement compliance internally. |
| paymentScheduleChecksum | string | Auth | Installment schedule verification hash. Used by Afterpay to verify the payment schedule has not been tampered with. | Internal to Afterpay's installment management. No downstream processing dependency. |
| orderDetails.consumer (enriched) | object | Auth, Capture | Afterpay may enrich the consumer object in responses with additional data not present in the original request (e.g., Afterpay-assigned consumer ID, verified phone). | Informational only. The enriched consumer data may be useful for merchant CRM but has no CH equivalent. |
| orderDetails.merchant | object | Auth, Capture | Afterpay merchant metadata returned in responses, including merchant name and configuration details. | Account-level metadata. No per-transaction mapping needed. |
| openToCaptureAmount | Money object | Auth, Capture | Remaining amount available for capture after partial capture. Contains amount (string) and currency. | Informational for partial capture scenarios. Could be surfaced in CH response as a custom extension, but no standard field exists. Log for operational monitoring. |
| created | string (ISO 8601) | Auth, Capture | UTC timestamp of when the Afterpay order was created. | Can be mapped to a generic timestamp field if one exists. Otherwise, log for reconciliation. |
| items[].categories | string[][] | Auth (Checkout) | Product category taxonomy for Afterpay risk assessment. Nested array of category paths. | Afterpay-specific risk signal. No Commerce Hub equivalent. Pass from merchant if available. |
| items[].estimatedShipmentDate | string | Auth (Checkout) | Estimated shipment date for pre-order or backorder items. | Afterpay-specific field for installment risk. No CH equivalent. |
| items[].preorder | boolean | Auth (Checkout) | Flag indicating item is a pre-order. Affects Afterpay's payment schedule. | Afterpay-specific field. No CH equivalent. |
| refundMerchantReference | string | Refund | Separate merchant reference specifically for the refund transaction (max 128 chars). Distinct from the order-level merchantReference (max 85 chars). | Can be mapped from a refund-specific reference field if CH provides one. Otherwise, log as metadata. |

---

## Commerce Hub Fields With No Afterpay Equivalent

These Commerce Hub request fields have no corresponding field in the Afterpay API. They are sent by the merchant or upstream platform but cannot be forwarded to Afterpay.

| CH Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| merchantDetails.storeId | string | All | Commerce Hub store identifier for multi-store merchants. | Not passed to Afterpay. Afterpay identifies merchants at the account level using the Merchant ID configured during onboarding. Store-level granularity is not supported by the Afterpay API. |
| merchantDetails.terminalId | string | All | Terminal identifier for point-of-sale transactions. | Not applicable for e-commerce BNPL transactions. Terminal IDs are a point-of-sale concept. Afterpay is online-only. |
| transactionDetails.captureFlag | boolean | Auth | Commerce Hub flag to toggle between auth-only and auth-with-capture in a single call. | Afterpay separates deferred auth (POST /v2/payments/auth) and immediate capture (POST /v2/payments/capture) into distinct endpoints. There is no boolean flag. The integration must call the appropriate endpoint based on the merchant's intent. |
| encryptionData | object | Auth | Card encryption payload (PAN, expiry, CVV) for card-based payments. | Not applicable for BNPL. Afterpay does not accept card-level encryption data. Customer payment details are managed entirely within Afterpay's hosted checkout. |
| splitShipment | object | Capture | Metadata describing split shipment scenarios where an order is fulfilled in multiple parcels. | Afterpay handles split fulfillment through partial capture. The merchant makes multiple capture calls with the relevant amounts. The model is amount-based rather than metadata-based. |
| dynamicDescriptors.mcc | string | All | Merchant Category Code for statement display. Allows per-transaction MCC override. | Afterpay manages merchant categorization at the account level during onboarding. Per-transaction MCC override is not supported. |
| amountComponents.taxAmounts | array | Auth | Order-level tax breakdown. Commerce Hub supports detailed tax component arrays. | Afterpay does not accept order-level tax amounts. Tax data is not required for Afterpay checkout creation. If tax reporting is needed, it must be handled outside the Afterpay flow. |
| orderData.itemDetails[].grossAmount | number | Auth | Computed line total (quantity x unitPrice). | Afterpay does not accept a line-level total amount. Afterpay computes the line total from quantity x price. The grossAmount field is dropped at the CH-to-Afterpay boundary. |
| orderData.itemDetails[].taxAmounts | array | Auth | Per-item tax breakdown with taxAmount and taxRate. | Afterpay does not accept per-item tax detail. Tax amounts are not part of the Afterpay items[] schema. Dropped at the boundary. |
| shippingAddress.address.stateOrProvince | string | Auth | Mapped to shipping.region. However, Afterpay expects different naming (region vs. stateOrProvince). | Successfully mapped via PASSTHROUGH -- this is a rename, not a gap. Listed here for completeness since the field names differ. |

---

## Impact Assessment

**Afterpay unmappable fields**: Low impact. All unmappable Afterpay fields are informational, audit-related, or Afterpay-internal. The `events[]` array is the most operationally useful -- logging it provides a complete audit trail. The `openToCaptureAmount` is useful for partial capture orchestration but can be tracked by the adapter. None affect core transaction processing, settlement, or reconciliation.

**Commerce Hub unmappable fields**: Low-to-medium impact. Most fields are not applicable to the BNPL pattern (encryptionData, terminalId). The `splitShipment` gap has a functional workaround (partial capture by amount). The `captureFlag` gap is architectural (Afterpay uses separate endpoints) and requires no workaround. The absence of tax-related fields on the Afterpay side means tax reporting must be handled outside the Afterpay integration path.

**Comparison to Klarna unmappable fields**: The Afterpay unmappable field set is slightly larger than Klarna's due to Afterpay's event log, installment-specific fields, and the absence of tax support. The Commerce Hub unmappable field set is similar. No unmappable field blocks the integration.

---

## Unmappable Field Summary by Category

| Category | Afterpay Side | CH Side | Integration Impact |
|---|---|---|---|
| Timing/Expiry | expires, created | -- | Low: log for monitoring |
| Audit/Events | events[] | -- | Low: log for audit trail |
| Installment Management | agreements[], paymentScheduleChecksum | -- | None: Afterpay-internal |
| Tax | -- | amountComponents.taxAmounts, itemDetails[].taxAmounts | Low: tax handled outside BNPL path |
| Line Item Computed | -- | itemDetails[].grossAmount | None: Afterpay computes from qty x price |
| B2B/POS | -- | storeId, terminalId, mcc | None: not applicable to BNPL |
| Card-Specific | -- | encryptionData | None: not applicable to BNPL |
| Fulfillment | -- | splitShipment | Low: partial capture workaround |
| Risk Signals | items[].categories, items[].preorder, items[].estimatedShipmentDate | -- | Low: optional enrichment |
