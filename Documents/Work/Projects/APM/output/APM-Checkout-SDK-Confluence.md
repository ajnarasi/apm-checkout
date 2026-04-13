# APM Checkout SDK — Hub Page

> Universal checkout adapter framework supporting 53 APMs across 6 integration patterns. TypeScript-first, plugin-based, production-ready.

---

## Quick Links

| Resource | Link | Description |
|----------|------|-------------|
| PRD | `APM-Checkout-SDK-PRD.md` | Full product requirements document |
| APM Tracker | `/docs/apm-tracker.xlsx` | Live status tracker for all 53 APMs |
| SDK Repo | `checkout-sdk/` | Source code — adapters, event bus, error taxonomy |
| Test Harness | `checkout-sdk/test/` | 239 API tests, 49 unit tests, 53-adapter callback sweep |
| Specs | `/docs/specs/` | Per-APM integration specs and provider documentation |
| Figma | Design System | Checkout button/widget component library |
| Runbook | `/docs/runbook.md` | Incident response for APM failures |

---

## What Is This

The APM Checkout SDK is a plugin-based adapter framework that standardizes the integration of 53 alternative payment methods behind a single public API. Instead of building each APM as a standalone 4-6 week engineering project, the framework provides a shared adapter interface, universal event bus (18 events), standardized error taxonomy (12 codes), and automated test harness. The PPRO factory alone covers 39 redirect-based APMs through parameterized configuration rather than custom code. 14 direct-integration adapters handle provider-specific SDKs for Klarna, CashApp, Google Pay, Apple Pay, PayPal, and others. The result: any new APM can be integrated in 2-3 days (or 1 day for PPRO APMs), and the entire 53-APM portfolio can be delivered by 2 engineers in 3-4 months.

---

## How to Add a New APM

### Option A: PPRO Redirect APM (39 APMs use this path)

If the APM is a redirect-based method supported by PPRO:

1. **Add configuration** — Create an entry in `ppro-config.ts` specifying the provider code, display name, region, required customer fields, and redirect URL pattern.
   ```typescript
   export const NEW_APM: PPROConfig = {
     code: 'NEWAPM',
     name: 'New APM',
     region: 'EU-XX',
     requiredFields: ['email', 'name'],
     redirectPattern: 'standard',
   };
   ```
2. **Register in factory** — Add the config to the PPRO factory registry in `ppro-factory.ts`.
3. **Add sandbox credentials** — Add provider sandbox URL and API keys to `.env.test`.
4. **Run callback sweep** — Execute `npm run test:sweep -- --adapter=NEWAPM` and confirm init/render/authorize/teardown pass.
5. **Add styling config** — Define brand colors, logo asset path, and button dimensions in `brand-config.ts`.
6. **Run full test suite** — Execute `npm run test` and confirm all suites pass with the new adapter included.
7. **Update tracker** — Mark the APM as "Active" in the APM tracker spreadsheet.

**Estimated effort: 1 day.**

### Option B: Direct-Integration APM (14 APMs use this path)

If the APM requires loading a provider-specific SDK, rendering a widget, or using a native browser API:

1. **Create adapter directory** — Add `src/adapters/{apm-name}/` with `{apm-name}-adapter.ts`.
2. **Implement the adapter interface:**
   ```typescript
   export class NewAPMAdapter implements APMAdapter {
     readonly code = 'NEWAPM';
     readonly name = 'New APM';
     readonly pattern = 'widget'; // or 'qr', 'native', 'iframe', 'static'

     async init(config: AdapterConfig): Promise<void> { /* Load SDK, validate config */ }
     async render(container: HTMLElement): Promise<void> { /* Mount UI */ }
     async authorize(params: AuthorizeParams): Promise<AuthorizeResult> { /* Execute payment */ }
     teardown(): void { /* Cleanup DOM, listeners, SDK resources */ }
   }
   ```
3. **Wire events** — Emit all relevant universal events via the injected event bus during each lifecycle method.
4. **Map errors** — Map provider-specific errors to the 12 SDK error codes in the adapter.
5. **Add sandbox credentials** — Add provider sandbox URL, API keys, and test accounts to `.env.test`.
6. **Write unit tests** — Add tests in `test/unit/{apm-name}.test.ts` covering init, render, authorize, teardown, error paths.
7. **Run callback sweep** — Execute `npm run test:sweep -- --adapter=NEWAPM`.
8. **Add styling** — Define brand config and verify 22 styling assertions pass.
9. **Run full test suite** — Execute `npm run test` and confirm all suites pass.
10. **Update tracker** — Mark the APM as "Active" in the APM tracker spreadsheet.

**Estimated effort: 2-3 days.**

---

## SDK Architecture

### Core Files

```
src/
  core/
    checkout.ts          — createCheckout factory, orchestration logic
    event-bus.ts         — Universal event bus with ordering enforcement
    error-taxonomy.ts    — 12 error codes, retry policies, error builder
    adapter-interface.ts — TypeScript interface all adapters implement
    config.ts            — Merchant configuration schema and validation
  adapters/
    ppro/                — Parameterized factory for 39 redirect APMs
    klarna/              — Widget rendering, OSM, session management
    cashapp/             — QR code generation, polling, deep link
    googlepay/           — Google Pay button, payment sheet, tokenization
    applepay/            — Apple Pay session, merchant validation, token
    paypal/              — PayPal Buttons, Messages, order capture
    affirm/              — Affirm checkout redirect, promo messaging
    afterpay/            — Afterpay redirect, installment messaging
    sezzle/              — Sezzle widget, static promo display
    venmo/               — Venmo redirect via PayPal SDK
    zip/                 — Zip/QuadPay redirect, promo messaging
  types/                 — Shared TypeScript type definitions
  test/                  — API, unit, and sweep test suites
```

### Public API

```typescript
// 1. Create — instantiate with merchant config
const checkout = createCheckout({
  merchantId: 'merchant_123',
  environment: 'sandbox',
  adapter: 'klarna',
  locale: 'en-US',
  amount: { value: 9999, currency: 'USD' },
});

// 2. Subscribe — bind to universal events
checkout.on('checkout:ready', () => console.log('Ready'));
checkout.on('authorize:complete', (result) => handleSuccess(result));
checkout.on('authorize:error', (error) => handleError(error));

// 3. Initialize — load provider SDK, validate config
await checkout.init();

// 4. Render — mount UI into target DOM element
checkout.render(document.getElementById('checkout-container'));

// 5. Authorize — execute payment flow
const result = await checkout.authorize();

// 6. Cleanup — unmount UI, release resources
checkout.teardown();
```

---

## Universal Event Contract (18 Events)

| # | Event | Category | Description | Fires After |
|---|-------|----------|-------------|-------------|
| 1 | `sdk:loading` | Lifecycle | Provider SDK script tag injected | — (first) |
| 2 | `sdk:loaded` | Lifecycle | Provider SDK script executed | sdk:loading |
| 3 | `sdk:error` | Lifecycle | Provider SDK failed to load | sdk:loading |
| 4 | `checkout:ready` | Lifecycle | Adapter initialized, ready to render | sdk:loaded |
| 5 | `checkout:destroyed` | Lifecycle | Adapter teardown complete | — (terminal) |
| 6 | `render:start` | Rendering | DOM mounting initiated | checkout:ready |
| 7 | `render:complete` | Rendering | UI fully rendered and interactive | render:start |
| 8 | `render:error` | Rendering | Rendering failed | render:start |
| 9 | `authorize:start` | Payment | Payment authorization initiated | render:complete |
| 10 | `authorize:complete` | Payment | Payment authorized successfully | authorize:start |
| 11 | `authorize:error` | Payment | Payment authorization failed | authorize:start |
| 12 | `authorize:cancel` | Payment | User cancelled payment flow | authorize:start |
| 13 | `redirect:start` | Navigation | Browser redirect to provider initiated | authorize:start |
| 14 | `redirect:return` | Navigation | User returned from provider redirect | redirect:start |
| 15 | `user:interaction` | Analytics | User engaged with APM UI element | render:complete |
| 16 | `promo:rendered` | Promotional | Promotional messaging widget displayed | render:complete |
| 17 | `promo:clicked` | Promotional | User clicked promotional messaging | promo:rendered |
| 18 | `error:unhandled` | Error | Unexpected error not covered by specific events | Any time |

**Ordering enforcement:** The event bus validates that events fire in the correct sequence. For example, `render:complete` will not fire unless `sdk:loaded` has already fired. Violations throw an `INTERNAL_ERROR` and emit `error:unhandled`.

---

## Sandbox Credentials

| Provider | Sandbox URL | Auth Method | Status |
|----------|-------------|-------------|--------|
| Klarna | `https://playground.klarna.com` | API key + client ID | Active |
| CashApp | `https://sandbox.cashapp.com` | Client ID + sandbox scope | Active |
| Google Pay | N/A (TEST environment flag) | Merchant ID (test) | Active |
| Apple Pay | `https://sandbox.apple.com` | Merchant cert (DER) + team ID | Active |
| PayPal | `https://sandbox.paypal.com` | Client ID + secret | Active |
| Affirm | `https://sandbox.affirm.com` | Public API key | Active |
| Afterpay | `https://global-api-sandbox.afterpay.com` | Merchant ID + secret | Active |
| Sezzle | `https://sandbox.gateway.sezzle.com` | Public key + secret | Active |
| Venmo | Via PayPal sandbox | PayPal client ID | Active |
| Zip | `https://sandbox.zip.co` | API key | Active |
| PPRO (39 APMs) | `https://sandbox.ppro.com` | Contract ID + API key | Active |

> **Note:** Sandbox credentials are stored in `.env.test` and should never be committed. Obtain credentials from the team password manager.

---

## Test Data Cheat Sheet

### Klarna

| Scenario | Email | Result |
|----------|-------|--------|
| Approved | `customer@email.com` | Payment approved |
| Denied | `denied@email.com` | Payment declined |
| Pending | `pending@email.com` | Payment pending review |

### CashApp Pay

| Scenario | Amount | Result |
|----------|--------|--------|
| Approved | `$1.00` | QR scan succeeds |
| Declined | `$0.01` | Declined after scan |
| Timeout | `$99.99` | QR expires |

### Afterpay

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Approved | `4111 1111 1111 1111` | Checkout approved |
| Declined | `4000 0000 0000 0002` | Checkout declined |

### Affirm

| Scenario | Method | Result |
|----------|--------|--------|
| Approved | Sandbox auto-approve flow | Checkout approved |
| Declined | Sandbox auto-decline flow | Checkout declined |

### Apple Pay

| Scenario | Card Number | Result |
|----------|-------------|--------|
| Approved | `4761 1200 1000 0492` | Authorized |
| Declined | `4000 0000 0000 0002` | Declined |
| 3DS | `4000 0000 0000 3220` | 3DS challenge |

### PPRO — BLIK

| Scenario | Code | Result |
|----------|------|--------|
| Approved | `123456` | BLIK approved |
| Declined | `000000` | BLIK declined |

### Google Pay

| Environment | Result |
|-------------|--------|
| `TEST` | Returns test payment token |
| `PRODUCTION` | Returns real token (requires merchant ID) |

---

## Promotional Messaging

| Provider | Type | Status | Notes |
|----------|------|--------|-------|
| Klarna | On-Site Messaging (OSM) | Real SDK | Dynamic installment pricing via Klarna SDK. Requires client ID. |
| PayPal | PayPal Messages | Real SDK | Pay Later messaging. Configurable style: text, flex, banner. |
| Sezzle | Static Widget | Real SDK | Installment badge via Sezzle widget SDK. |
| Afterpay | Installment Messaging | Simulated | HTML/CSS. Displays "4 interest-free payments of $X.XX". |
| Affirm | Promo Messaging | Simulated | HTML/CSS. Displays "Starting at $X/mo with Affirm". |
| Zip | Pay-in-4 Messaging | Simulated | HTML/CSS. Displays "4 interest-free payments of $X.XX". |

---

## Architecture Decision Records

### ADR-001: Single `authorize()` Method

**Decision:** All adapters expose a single `authorize()` method that encapsulates the entire payment flow (redirect, widget interaction, QR scan, etc.).

**Context:** Early designs had separate methods per pattern (`redirect()`, `scanQR()`, `submitWidget()`). This leaked implementation details and forced consumers to branch on adapter type.

**Consequence:** Consumers call `authorize()` regardless of APM. The adapter internally handles the flow appropriate to its pattern. Return type is always `AuthorizeResult`.

### ADR-002: PPRO Factory Pattern

**Decision:** All 39 PPRO redirect APMs share a single factory-generated adapter rather than 39 individual adapter classes.

**Context:** PPRO APMs follow an identical flow: collect fields, redirect to provider, handle callback. The only differences are provider code, required fields, and display name.

**Consequence:** Adding a new PPRO APM requires only a configuration object (1 day effort). The factory handles init, render, authorize, and teardown identically for all 39 APMs.

### ADR-003: TypeScript-First with JS Output

**Decision:** Core SDK is authored in TypeScript. Published artifacts include compiled JavaScript with `.d.ts` type definitions.

**Context:** TypeScript provides compile-time safety for adapter contracts, event payloads, and error structures. JS output ensures compatibility with non-TS consumers.

**Consequence:** All adapter interfaces, event types, and error types are fully typed. Contributors must write TypeScript. Consumers can use JS or TS.

### ADR-004: Event Ordering Enforcement

**Decision:** The event bus enforces strict ordering constraints. Events that violate ordering throw an internal error.

**Context:** Without ordering enforcement, race conditions in async SDK loading could produce impossible event sequences (e.g., `authorize:complete` before `sdk:loaded`), leading to silent analytics corruption and hard-to-debug UX bugs.

**Consequence:** The event bus maintains a state machine. Events that arrive out of order are rejected and an `error:unhandled` event is emitted. This catches integration bugs early.

---

## Rollout Phases

| Phase | Region | APMs | Sprints | APM Count | Key Methods |
|-------|--------|------|---------|-----------|-------------|
| 1 | US | Google Pay, Apple Pay, PayPal, Klarna, Affirm, Afterpay, CashApp, Venmo, Sezzle, Zip | Sprint 1-3 | 10 | Native SDK, BNPL, QR, Wallet |
| 2 | Europe | iDEAL, Bancontact, Sofort, Giropay, EPS, P24, BLIK, Trustly, Swish, Vipps, MobilePay, Multibanco, MB WAY, Satispay, MyBank, TWINT | Sprint 4-6 | 16 | PPRO redirect, bank transfers |
| 3 | LATAM | PIX, Boleto, OXXO, SPEI, PSE, Efecty, Webpay, Khipu, Rapipago, Pago Facil | Sprint 7-8 | 10 | QR, voucher, redirect |
| 4 | APAC | Alipay, WeChat Pay, KakaoPay, Naver Pay, Toss, PayNow, GrabPay, Boost, Touch 'n Go, DANA, OVO, GCash, Maya, PromptPay, TrueMoney, LINE Pay, PayPay | Sprint 9-12 | 17 | Super-apps, wallets, QR |
| — | **Total** | — | **12 sprints** | **53** | — |

---

## Getting Started (New Team Members)

Follow these 6 steps to get up and running with the APM Checkout SDK:

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd checkout-sdk
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env.test
# Fill in sandbox credentials from the team password manager
```

### Step 3: Run the Test Suite

```bash
# Run all tests (API + unit + sweep)
npm run test

# Expected output:
# API Integration Tests:  239/239 PASS
# Unit Tests:             49/49  PASS
# Callback Sweep:         53/53  PASS
```

### Step 4: Start the Dev Server

```bash
npm run dev
# Opens test harness at http://localhost:3000
# Select any APM from the dropdown to test interactively
```

### Step 5: Explore an Adapter

Read through a direct-integration adapter to understand the pattern. Recommended starting points:

- `src/adapters/klarna/klarna-adapter.ts` — Widget pattern with promotional messaging
- `src/adapters/cashapp/cashapp-adapter.ts` — QR code pattern
- `src/adapters/ppro/ppro-factory.ts` — Factory pattern for redirect APMs

### Step 6: Build and Validate

```bash
# TypeScript compilation
npm run build

# Lint and format
npm run lint

# Run the full callback sweep against all 53 adapters
npm run test:sweep
```

---

## FAQ

**Q: How do I test a specific APM in isolation?**
A: Run `npm run test:sweep -- --adapter=KLARNA` (replace KLARNA with the APM code).

**Q: What if a provider sandbox is down?**
A: The test harness includes mock mode. Run with `MOCK_PROVIDERS=true` to use recorded responses.

**Q: How do I add promotional messaging for a new provider?**
A: If the provider has a JS SDK for messaging, create a real integration in the adapter. Otherwise, add a simulated HTML/CSS render following the Afterpay pattern.

**Q: Where are the sandbox credentials stored?**
A: In `.env.test` (not committed). Get values from the team password manager under "APM Sandbox Credentials".

**Q: How do I run tests against a specific region's APMs?**
A: Run `npm run test:sweep -- --region=EU` (options: US, EU, LATAM, APAC).

---

*Last updated: 2026-04-12*
