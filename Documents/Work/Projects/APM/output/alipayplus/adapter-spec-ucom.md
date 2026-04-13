# Ucom - Commerce Hub Adapter Specification for Alipay+

> Generated: 2026-04-12 | Pattern: qr-code | Commerce Hub: 1.26.0302 | Ucom: 0.2.3 | Provider: Alipay+ (Direct) | Confidence: verified

---

## Architecture

```mermaid
graph LR
    A["Ucom Merchant"] --> B["Adapter"]
    B --> C["Commerce Hub"]
    C --> D["Alipay+"]
    D --> E["APAC Wallets"]
    style A fill:#1a1a2a,stroke:#ff9800,color:#e0e0e0
    style B fill:#1a1a2a,stroke:#ff9800,color:#e0e0e0
    style C fill:#1a1a2a,stroke:#6C63FF,color:#e0e0e0
    style D fill:#1a1a2a,stroke:#1976d2,color:#e0e0e0
    style E fill:#1a1a2a,stroke:#4caf50,color:#e0e0e0
```

## Schema Changes Required

### FundingSourceType Enum

Add `ALIPAYPLUS` to the existing FundingSourceType enum.

### New AlipayPlus Object on FundingSource

```yaml
AlipayPlus:
  type: object
  properties:
    walletType:
      type: string
      description: Selected APAC wallet identifier (e.g., GCASH, KAKAOPAY, DANA)
      readOnly: true
    normalUrl:
      type: string
      description: Redirect URL for customer wallet selection and payment
      readOnly: true
    paymentData:
      type: string
      description: SDK data for in-app payment flow (APP terminal type only)
      readOnly: true
    pspId:
      type: string
      description: Payment Service Provider ID of the selected wallet
      readOnly: true
```

## Field Mapping (Ucom to Commerce Hub)

| Ucom Field | Type | CH Field | Transform | Notes |
|---|---|---|---|---|
| authorization.requestedAmount | number | amount.total | NONE | Both decimal |
| authorization.currencyCode | string | amount.currency | PASSTHROUGH | |
| authorization.merchantId | string | merchantDetails.merchantId | PASSTHROUGH | |
| authorization.fundingSource.type | string | paymentMethod.provider | MAP_ENUM | ALIPAYPLUS |
| authorization.storeId | string | merchantDetails.storeId | PASSTHROUGH | |

## Auth Bridging

Ucom HMAC auth to CH HMAC auth (same as other APMs — recompute with CH credentials).

## Error Code Mapping

| CH Error | Ucom Error |
|---|---|
| INVALID_REQUEST (400) | BadRequest (400) |
| AUTHENTICATION_ERROR (401) | Unauthorized (401) |
| RESOURCE_NOT_FOUND (404) | NotFound (404) |
| GATEWAY_ERROR (500) | ServerError (500) |
