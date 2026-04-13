# PayPal Pay Later — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | PAYPAL_PAYLATER |
| **Display Name** | PayPal Pay Later |
| **Pattern** | server-bnpl |
| **SDK CDN URL** | https://www.paypal.com/sdk/js?client-id=sb&enable-funding=paylater&components=buttons,messages |
| **NPM Package** | @paypal/paypal-js |
| **SDK Version** | v5 |
| **Script Loading** | async script tag with `enable-funding=paylater` param |
| **Global Variable** | paypal |
| **CSP script-src** | www.paypal.com |
| **CSP connect-src** | www.sandbox.paypal.com, www.paypal.com, api.sandbox.paypal.com, api.paypal.com |
| **Sandbox URL** | https://www.sandbox.paypal.com |
| **Sandbox Type** | Sandbox (client-id=sb, no signup needed) |
| **Auth Scheme** | OAuth2 (Client ID + Secret, same as PayPal) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| US | USD | Primary market — Pay in 4 ($30-$1,500) |
| GB | GBP | UK market — Pay in 3 |
| DE | EUR | Europe — available for eligible merchants |
| AU | AUD | APAC — Pay in 4 |
| FR | EUR | Pay in 4x |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | PASSTHROUGH |
| **Example** | 49.99 → "49.99" |
| **Type** | String (decimal format, same as PayPal) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **fundingSource** | paypal.FUNDING.PAYLATER | PAYLATER |
| **color** | gold, blue, silver, white, black | blue |
| **shape** | rect, pill, sharp | rect |
| **height** | 25-55px | 40px |
| **label** | pay (shows "Pay Later") | pay |
| **Brand Color** | #003087 (PayPal Blue) | #003087 |

### Promotional Messaging

| Property | Options | Default |
|---|---|---|
| **Component** | paypal.Messages | Required |
| **amount** | Numeric (cart total) | — |
| **style.layout** | text, flex | flex |
| **style.color** | blue, black, white, gray, monochrome | blue |
| **style.ratio** | 1x1, 1x4, 8x1, 20x1 | 8x1 |
| **Messaging Behavior** | Auto-selects "Pay in 4" or "Pay Monthly" based on amount | — |
| **Min Amount** | $30 (US) | — |
| **Max Amount** | $1,500 (US, Pay in 4) / $10,000 (Pay Monthly) | — |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| Client ID | Credential vault | Same as PayPal — PayPal developer portal |
| Client Secret | Credential vault | For OAuth2 token exchange |
| Merchant ID | Configuration | PayPal merchant account ID |
| Pay Later Eligibility | PayPal account settings | Must be enabled for merchant account |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| Pay in 4 | Yes | 4 interest-free installments ($30-$1,500) |
| Pay Monthly | Yes | Monthly financing (amount-dependent) |
| Widget/Embedded | Yes | Pay Later button renders in checkout |
| Promotional Messaging | Yes | "Pay in 4" / "Pay Monthly" messaging on PDP/cart |
| Redirect | Yes | Redirects to PayPal for BNPL approval |

## Section C: Event Contract

| Event | Supported | When Emitted |
|---|---|---|
| PAYMENT_METHOD_READY | Yes | After Pay Later order created |
| PAYMENT_AUTHORIZED | Yes | After customer completes Pay Later approval |
| PAYMENT_ERROR | Yes | On validation, network, or auth failure |
| PAYMENT_CANCELLED | Yes | Customer cancels Pay Later flow |
| SHIPPING_ADDRESS_CHANGED | Yes | Customer updates shipping in PayPal |
| SHIPPING_METHOD_CHANGED | Yes | Customer changes shipping method |
| PROMO_MESSAGE_RENDERED | Yes | Promotional messaging widget loads |

## Section D: Test Data

| Scenario | Test Data | Expected Result |
|---|---|---|
| **Sandbox** | client-id=sb | No signup needed |
| **Pay in 4 eligible** | Amount $30-$1,500 | Shows "Pay in 4" messaging |
| **Pay Monthly eligible** | Amount $199+ | Shows "Pay Monthly" option |
| **Below minimum** | Amount < $30 | Pay Later button hidden |
| **Buyer account** | PayPal Developer sandbox buyer | Completes BNPL flow |

## Section E: API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/paypal/paylater-order` | POST | Create Pay Later order |

### Request Schema

```json
{
  "amount": "49.99",
  "currency": "USD",
  "merchantOrderId": "SDK-1234567890",
  "returnUrls": {
    "successUrl": "http://localhost:3847/checkout-sdk-test.html",
    "cancelUrl": "http://localhost:3847/checkout-sdk-test.html"
  }
}
```

### Response Schema

```json
{
  "id": "PPL_1234567890_abc123",
  "status": "CREATED",
  "paymentMethod": "paylater",
  "links": [
    { "rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=PPL_..." }
  ],
  "_raw": {
    "id": "PPL_1234567890_abc123",
    "status": "CREATED",
    "payment_source": {
      "pay_later": {
        "experience_context": {
          "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED"
        }
      }
    }
  }
}
```
