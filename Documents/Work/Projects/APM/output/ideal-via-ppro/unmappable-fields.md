# iDEAL via PPRO -- Unmappable Fields

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
```

---

## PPRO Fields With No Commerce Hub Equivalent

These PPRO response or configuration fields have no corresponding field in the Commerce Hub schema. They are available from PPRO but cannot be stored or forwarded through Commerce Hub without schema extension.

| PPRO Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| paymentMedium | string | Auth (Create Charge) | PPRO channel descriptor, always "ECOMMERCE" for web transactions | PPRO-specific metadata. Commerce Hub uses its own channel model (`transactionInteraction.origin`). No downstream processing dependency. Drop at the PPRO-to-CH boundary. |
| scheduleType | string | Auth (Create Charge) | PPRO scheduling metadata, typically "UNSCHEDULED" for one-time bank redirects | Not applicable for iDEAL one-time payments. Drop at the PPRO-to-CH boundary. |
| instrumentId | string | Auth (Create Charge) | PPRO payment instrument identifier (e.g., "instr_13qSCuBpkdyoue9ktrtN6") | Mapped to `paymentMethod.paymentToken.tokenData` as Tier 2 but semantics differ. In PPRO, instrumentId represents the payment instrument used for the charge. In CH, tokenData typically represents a reusable token. For iDEAL (single-use bank redirect), this field is informational. Log for reconciliation. |
| _links | object | All capabilities | HATEOAS navigation links: `_links.captures.href`, `_links.refunds.href`, `_links.voids.href` | PPRO uses HATEOAS for API navigation. Commerce Hub does not expose HATEOAS links to merchants. These links are consumed internally by the CH-to-PPRO integration layer to construct capture/refund/void endpoint URLs. Not surfaced in CH responses. |
| authenticationMethods[].details.requestMethod | string | Auth (Create Charge) | HTTP method for the redirect URL (always "GET" for iDEAL bank redirect) | Commerce Hub does not track the HTTP method of redirect URLs. The redirect URL itself (`requestUrl`) is mapped to `checkoutInteractions.actions.url`. The method is assumed to be GET for browser redirects. |

---

## Commerce Hub Fields With No PPRO Equivalent

These Commerce Hub request fields have no corresponding field in the PPRO API. They are sent by the merchant or upstream platform but cannot be forwarded to PPRO.

| CH Field | Type | Capability | Context | Resolution |
|---|---|---|---|---|
| merchantDetails.storeId | string | All | Commerce Hub store identifier | Not passed to PPRO. PPRO identifies merchants at the account level using the `Merchant-Id` header. Store-level granularity is not supported by PPRO. |
| merchantDetails.terminalId | string | All | Terminal identifier | Not applicable for e-commerce bank redirect transactions. Terminal IDs are a point-of-sale concept. |
| encryptionData | object | Auth | Card encryption payload (PAN, expiry, CVV) | Not applicable for bank redirect. iDEAL does not accept card-level encryption data. Customers authenticate directly with their bank. |
| splitShipment | object | Capture | Metadata for split shipment scenarios | Not applicable for bank redirect payments. iDEAL is a payment authorization mechanism, not tied to fulfillment logistics. Single capture per authorization is the standard pattern. |
| dynamicDescriptors.mcc | string | All | Merchant Category Code for statement display | PPRO manages merchant categorization at the account level during onboarding. Per-transaction MCC override is not supported by PPRO. |

---

## Impact Assessment

**PPRO unmappable fields**: No impact. All unmappable PPRO fields are either metadata (paymentMedium, scheduleType), internal navigation (_links), or informational (requestMethod). None affect transaction processing, settlement, or reconciliation. The instrumentId field is mapped as Tier 2 to tokenData for observability but carries different semantics.

**Commerce Hub unmappable fields**: No impact. All unmappable CH fields are either not applicable to the bank redirect pattern (encryptionData, splitShipment, terminalId) or managed at the PPRO account level (storeId, mcc). No workaround is required for any of these fields.

**Net assessment**: Zero blocking gaps. The bank redirect pattern is simpler than BNPL, resulting in fewer unmappable fields on both sides. The PPRO aggregator model absorbs much of the complexity that would otherwise create mapping gaps.
