# Zepto — Checkout SDK Integration Spec

## Section A: SDK Metadata

| Property | Value |
|---|---|
| **APM Code** | ZEPTO |
| **Display Name** | Zepto |
| **Pattern** | bank-redirect |
| **SDK CDN URL** | N/A (API-only, no client SDK) |
| **NPM Package** | N/A |
| **SDK Version** | API v20260101 |
| **Script Loading** | none (server-side API calls only) |
| **Global Variable** | N/A |
| **CSP connect-src** | api.sandbox.zeptopayments.com, api.zeptopayments.com |
| **Sandbox URL** | https://api.sandbox.zeptopayments.com |
| **Sandbox Type** | Free sandbox (sign up at go.sandbox.zeptopayments.com) |
| **Auth Scheme** | OAuth 2.0 (client_credentials grant) |

## Section B: Configuration Mapping

### Supported Regions & Currencies

| Country | Currency | Notes |
|---|---|---|
| AU | AUD | Primary market — PayTo, NPP, Direct Entry |

### Amount Format

| Property | Value |
|---|---|
| **Transform** | MULTIPLY_100 |
| **Example** | 49.99 -> 4999 |
| **Type** | Integer (cents) |

### Button/UI Configuration

| Property | Options | Default |
|---|---|---|
| **label** | Pay with Zepto | Pay with Zepto |
| **Brand Color** | #6C63FF (Zepto Purple) | #6C63FF |

### Payment Channels

| Channel | Description | Speed |
|---|---|---|
| **PayTo** | Real-time payment agreement via NPP | Instant |
| **NPP** | New Payments Platform direct transfer | Instant |
| **BECS Direct Entry** | Legacy direct debit | 2-3 business days |
| **PayID** | Real-time payments via PayID identifier | Instant |

### Required Merchant Credentials

| Credential | Source | Notes |
|---|---|---|
| OAuth Client ID | Zepto Developer Portal | For OAuth2 token exchange |
| OAuth Client Secret | Zepto Developer Portal | Keep server-side only |
| Split Contract ID | Zepto Dashboard | Merchant's split configuration |

### Supported Flows

| Flow | Supported | Notes |
|---|---|---|
| PayTo Agreement | Yes | Customer authorizes via bank app |
| Direct Debit | Yes | Requires pre-existing agreement |
| NPP Payout | Yes | Real-time outbound payments |
| PayID Receive | Yes | Receive via PayID/BSB+account |
| Redirect | Yes | Customer redirected to bank for PayTo auth |
| Widget/Embedded | No | API-only, no client widget |
| QR Code | No | — |

## Section C: Event Contract

| Event | Supported | When Emitted |
|---|---|---|
| PAYMENT_METHOD_READY | Yes | After PayTo agreement created |
| PAYMENT_AUTHORIZED | Yes | After customer authorizes at bank |
| PAYMENT_ERROR | Yes | On validation, network, or auth failure |
| PAYMENT_CANCELLED | Yes | Customer cancels PayTo authorization |
| REDIRECT_REQUIRED | Yes | Redirect to bank for PayTo auth |

## Section D: API Endpoints

### Core Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/zepto/agreement` | POST | Create PayTo agreement |

### PayTo Agreement Flow

```
1. Merchant -> POST /api/zepto/agreement { amount, currency }
2. Server -> Zepto API: POST /payto/agreements
3. Zepto returns { uid, authorization_url, status: 'pending_authorization' }
4. Customer redirected to authorization_url (bank app)
5. Customer authorizes PayTo agreement at their bank
6. Zepto sends webhook: agreement.authorized
7. Merchant collects payment: POST /payments { agreement_uid, amount }
```

### Request Schema

```json
{
  "amount": 4999,
  "currency": "AUD",
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
  "id": "ZPT_1234567890_abc123",
  "status": "pending_authorization",
  "paymentMethod": "payto",
  "_raw": {
    "uid": "ZPT_1234567890_abc123",
    "status": "pending_authorization",
    "authorization_url": "https://go.sandbox.zeptopayments.com/authorize/ZPT_...",
    "type": "payto_agreement",
    "channels": ["new_payments_platform"]
  }
}
```

## Section E: Sandbox Test Data

| Scenario | Test Data | Expected Result |
|---|---|---|
| **Sandbox** | Sandbox OAuth credentials | Free sandbox environment |
| **PayTo agreement** | Any AUD amount | Agreement created, authorization_url returned |
| **Simulate NPP payment** | POST /simulate/npp_payment | Incoming real-time payment simulated |
| **Simulate PayID payment** | POST /simulate/payid_payment | PayID receivable credited |
| **Simulate DE payment** | POST /simulate/de_payment | Direct Entry payment simulated |

## Section F: Webhook Events

| Event | Description |
|---|---|
| `agreement.authorized` | Customer authorized PayTo agreement |
| `agreement.cancelled` | Customer or merchant cancelled agreement |
| `payment.created` | Payment initiated |
| `payment.completed` | Payment settled successfully |
| `payment.failed` | Payment failed (insufficient funds, etc.) |
| `refund.created` | Refund initiated |
| `refund.completed` | Refund settled |
