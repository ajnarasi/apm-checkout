# Klarna BNPL -- Unmappable Fields

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

## Klarna Fields With No Commerce Hub Equivalent

These Klarna response or configuration fields have no corresponding field in the Commerce Hub schema. They are available from Klarna but cannot be stored or forwarded through Commerce Hub without schema extension.

| Klarna Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| payment_method_categories[].asset_urls | object | Auth (Session) | Klarna badge and logo URLs for merchant UI rendering | Pass to merchant via paymentMethod metadata or out-of-band configuration. Not required for transaction processing. |
| authorized_payment_method.number_of_installments | integer | Auth (Place Order) | Number of BNPL installments the customer selected | No Commerce Hub equivalent. Log for reporting and analytics. Consider future CH schema extension for installment data. |
| order.initial_payment_method | string | Auth (Place Order) | First payment method category the customer was presented | Informational only. No downstream processing dependency. |
| merchant_urls.terms | string | Configuration | URL for Klarna Checkout merchant terms page | Not used in the Payments API flow. Applies only to Klarna Checkout (KCO), which is a separate integration pattern. |
| merchant_urls.checkout | string | Configuration | URL for Klarna Checkout page | Not used in the Payments API flow. KCO-specific. |
| merchant_urls.confirmation | string | Configuration | URL for Klarna Checkout confirmation page | Not used in the Payments API flow. KCO-specific. |
| merchant_urls.push | string | Configuration | URL for Klarna server-to-server push notification | Not used in the Payments API flow. KCO-specific. |

---

## Commerce Hub Fields With No Klarna Equivalent

These Commerce Hub request fields have no corresponding field in the Klarna API. They are sent by the merchant or upstream platform but cannot be forwarded to Klarna.

| CH Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| merchantDetails.storeId | string | All | Commerce Hub store identifier | Not passed to Klarna. Klarna identifies merchants at the account level using the Merchant ID (configured during onboarding). Store-level granularity is not supported. |
| merchantDetails.terminalId | string | All | Terminal identifier | Not applicable for e-commerce BNPL transactions. Terminal IDs are a point-of-sale concept. |
| transactionDetails.captureFlag | boolean | Auth | Commerce Hub flag to toggle between auth-only and auth-with-capture | Klarna separates authorization and capture into distinct API endpoints. There is no boolean flag equivalent. Auth always produces an authorized order; capture is a separate call. |
| checkoutInteractions.returnUrls | object | Auth | Redirect URLs for post-payment navigation | Not applicable. Klarna Payments uses an embedded widget, not browser redirect. The customer never leaves the merchant page. |
| encryptionData | object | Auth | Card encryption payload (PAN, expiry, CVV) | Not applicable for BNPL. Klarna does not accept card-level encryption data. |
| splitShipment | object | Capture | Metadata for split shipment scenarios | Klarna handles split fulfillment through partial capture with a subset of `order_lines[]`. The model is different: instead of metadata describing the split, the merchant makes multiple capture calls with the relevant line items. |
| dynamicDescriptors.mcc | string | All | Merchant Category Code for statement display | Klarna manages merchant categorization at the account level during onboarding. Per-transaction MCC override is not supported. |

---

## Impact Assessment

**Klarna unmappable fields**: Low impact. All unmappable Klarna fields are informational or UI-related. None affect transaction processing, settlement, or reconciliation.

**Commerce Hub unmappable fields**: Low-to-medium impact. Most fields are not applicable to the BNPL pattern. The `splitShipment` gap has a functional workaround (partial capture with line-item subsets). The `captureFlag` gap is architectural (Klarna uses separate endpoints) and requires no workaround.
