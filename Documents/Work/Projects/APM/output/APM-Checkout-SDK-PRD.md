# APM Checkout SDK — Product Requirements Document

**Document Version:** 1.0  
**Date:** 2026-04-12  
**Author:** Product Management  
**Status:** Leadership Review  
**Classification:** Internal

---

## 1. Executive Summary

This document defines the product requirements for a universal checkout SDK adapter framework designed to support 53 Alternative Payment Methods (APMs) across 6 distinct integration patterns. The framework eliminates redundant per-APM engineering effort by providing a plugin-based architecture with a unified public API, universal event contract, and standardized error taxonomy.

**Key outcomes:**

- **Integration velocity:** Reduces per-APM integration from 4-6 weeks to 2-3 days using pre-built adapters and a shared adapter interface.
- **Coverage:** 53 APMs spanning US, Europe, LATAM, and APAC markets across 6 patterns: redirect, widget, QR code, native SDK, iframe, and static display.
- **TypeScript-first:** Core SDK authored in TypeScript with compiled JavaScript output for broad consumption. Full type safety across adapter contracts, event payloads, and error structures.
- **Universal event bus:** 18 standardized lifecycle events with strict ordering enforcement, enabling consistent analytics, error handling, and UX orchestration regardless of underlying APM behavior.
- **Standardized errors:** 12 error codes with retry policies, covering the full failure surface from network timeouts to provider declines.
- **Plugin architecture:** Adapters register via a factory pattern. The PPRO factory alone covers 39 redirect-based APMs through a single parameterized adapter. 14 additional APMs use direct-integration adapters for provider-specific SDKs.
- **Real SDK integrations delivered:** Klarna (widget rendering + On-Site Messaging), CashApp Pay (QR code generation), Google Pay (TEST environment button), PayPal (Messages promotional component), Sezzle (static promotional widget).
- **Promotional messaging:** Real SDK-driven promotional messaging for Klarna OSM, PayPal Messages, and Sezzle widgets. Simulated messaging for Afterpay, Affirm, and Zip.
- **Test coverage:** 239/239 API integration tests passing, 49/49 unit tests passing, 53/53 callback sweep passing across all registered adapters.

The framework is architected to serve as the payments frontend infrastructure layer, enabling rapid market entry and APM coverage expansion without proportional engineering headcount growth.

---

## 2. Problem Statement

### Current State

Each APM integration today is treated as a standalone engineering project. A single APM requires:

1. **Requirements gathering** (3-5 days) — Reading provider documentation, identifying sandbox access procedures, mapping API contracts.
2. **Architecture and scaffolding** (3-5 days) — Designing the adapter, choosing rendering strategy (redirect vs. widget vs. QR), wiring into checkout flow.
3. **Callback and webhook wiring** (3-5 days) — Handling provider-specific callback formats, return URLs, notification endpoints, and state reconciliation.
4. **Data transformation** (2-3 days) — Mapping internal order/cart models to provider-specific request formats and normalizing provider responses.
5. **Error handling** (2-3 days) — Implementing provider-specific error parsing, retry logic, fallback behavior, and user-facing error messaging.
6. **Styling and UX** (3-5 days) — Rendering provider buttons/widgets per brand guidelines, handling responsive layouts, dark mode, loading states.
7. **Testing and QA** (5-7 days) — Sandbox testing, callback verification, edge case coverage, cross-browser validation.

**Total per APM: 4-6 weeks of engineering effort.**

### The Scale Problem

With 53 APMs required for full global market coverage:

- Sequential delivery at 4-6 weeks each = **212-318 engineering weeks = 4-6 years** with a single engineer.
- Even with 2 dedicated engineers working in parallel, full coverage would take **2-3 years**.
- Each APM built independently leads to inconsistent error handling, divergent event models, duplicated rendering logic, and unmaintainable test suites.
- Provider SDK updates require per-integration maintenance rather than centralized upgrades.

### Business Impact

- **Delayed market entry:** Cannot launch in new regions without APM coverage (e.g., iDEAL for Netherlands, PIX for Brazil, GrabPay for SEA).
- **Conversion loss:** Shoppers abandon checkout when their preferred payment method is unavailable. APM availability directly correlates to conversion rate in non-US markets.
- **Engineering opportunity cost:** Senior engineers spend weeks on repetitive integration plumbing instead of differentiated product work.
- **Maintenance burden:** N independent integrations means N codepaths to maintain, monitor, and upgrade.

---

## 3. Solution

### Overview

A plugin-based adapter framework that standardizes APM integration behind a universal interface. The framework provides:

1. **Adapter Interface** — A TypeScript interface that every APM adapter must implement: `init()`, `render()`, `authorize()`, `teardown()`, and event emission hooks.
2. **PPRO Factory** — A single parameterized adapter factory that generates adapters for 39 redirect-based APMs. Each PPRO APM is defined by a configuration object (provider code, required fields, redirect behavior) rather than custom code.
3. **Direct-Integration Adapters** — 14 adapters for APMs requiring provider-specific SDK loading, widget rendering, or native browser API access (e.g., Klarna, CashApp, Google Pay, Apple Pay, PayPal).
4. **Universal Event Bus** — A pub/sub event system emitting 18 standardized events with strict ordering. Consumers subscribe once and receive consistent payloads regardless of APM.
5. **Error Taxonomy** — 12 error codes covering all failure modes. Each code includes retry eligibility and recommended retry policy.
6. **Automated Test Harness** — API-level integration tests, unit tests for adapter logic, and a full callback sweep that exercises all 53 adapters end-to-end.

### Public API

```typescript
const checkout = createCheckout(config);   // Factory: instantiate with merchant config
checkout.on('checkout:ready', handler);     // Subscribe: bind to universal events
await checkout.init();                      // Initialize: load provider SDKs, validate config
checkout.render(container);                 // Render: mount UI into target DOM element
const result = await checkout.authorize();  // Authorize: execute payment flow, return result
checkout.teardown();                        // Cleanup: unmount UI, release resources
```

### Design Principles

- **Convention over configuration:** Sensible defaults for every adapter. Merchants override only what they need.
- **Fail loud, recover gracefully:** Errors surface immediately via events with actionable error codes. Retryable errors include backoff policies.
- **Provider SDKs are implementation details:** The public API never exposes provider-specific objects, tokens, or DOM elements.
- **Type safety end-to-end:** Adapter contracts, event payloads, error structures, and config objects are fully typed.

---

## 4. APM Inventory

53 APMs across 4 regions and 6 integration patterns.

| # | Code | Name | Region | Pattern | Sandbox Status |
|---|------|------|--------|---------|----------------|
| 1 | KLARNA | Klarna | US/EU | Widget | Active — Real SDK |
| 2 | CASHAPP | CashApp Pay | US | QR Code | Active — Real SDK |
| 3 | GOOGLEPAY | Google Pay | Global | Native SDK | Active — TEST env |
| 4 | APPLEPAY | Apple Pay | Global | Native SDK | Active — Sandbox |
| 5 | PAYPAL | PayPal | Global | Redirect/Widget | Active — Real SDK |
| 6 | VENMO | Venmo | US | Redirect | Active — Sandbox |
| 7 | AFFIRM | Affirm | US | Redirect | Active — Sandbox |
| 8 | AFTERPAY | Afterpay | US/AU | Redirect | Active — Sandbox |
| 9 | SEZZLE | Sezzle | US | Widget | Active — Real SDK |
| 10 | ZIP | Zip (QuadPay) | US | Redirect | Active — Sandbox |
| 11 | IDEAL | iDEAL | EU-NL | Redirect (PPRO) | Active |
| 12 | BANCONTACT | Bancontact | EU-BE | Redirect (PPRO) | Active |
| 13 | SOFORT | Sofort/Klarna Pay Now | EU-DE/AT | Redirect (PPRO) | Active |
| 14 | GIROPAY | Giropay | EU-DE | Redirect (PPRO) | Active |
| 15 | EPS | EPS | EU-AT | Redirect (PPRO) | Active |
| 16 | P24 | Przelewy24 | EU-PL | Redirect (PPRO) | Active |
| 17 | BLIK | BLIK | EU-PL | Redirect (PPRO) | Active |
| 18 | TRUSTLY | Trustly | EU-Nordics | Redirect (PPRO) | Active |
| 19 | SWISH | Swish | EU-SE | Redirect (PPRO) | Active |
| 20 | VIPPS | Vipps | EU-NO | Redirect (PPRO) | Active |
| 21 | MOBILEPAY | MobilePay | EU-DK/FI | Redirect (PPRO) | Active |
| 22 | MULTIBANCO | Multibanco | EU-PT | Redirect (PPRO) | Active |
| 23 | MBWAY | MB WAY | EU-PT | Redirect (PPRO) | Active |
| 24 | SATISPAY | Satispay | EU-IT | Redirect (PPRO) | Active |
| 25 | MYBANK | MyBank | EU-IT | Redirect (PPRO) | Active |
| 26 | TWINT | TWINT | EU-CH | Redirect (PPRO) | Active |
| 27 | PIX | PIX | LATAM-BR | QR Code (PPRO) | Active |
| 28 | BOLETO | Boleto Bancario | LATAM-BR | Voucher (PPRO) | Active |
| 29 | OXXO | OXXO | LATAM-MX | Voucher (PPRO) | Active |
| 30 | SPEI | SPEI | LATAM-MX | Redirect (PPRO) | Active |
| 31 | PSE | PSE | LATAM-CO | Redirect (PPRO) | Active |
| 32 | EFECTY | Efecty | LATAM-CO | Voucher (PPRO) | Active |
| 33 | WEBPAY | Webpay | LATAM-CL | Redirect (PPRO) | Active |
| 34 | KHIPU | Khipu | LATAM-CL | Redirect (PPRO) | Active |
| 35 | RAPIPAGO | Rapipago | LATAM-AR | Voucher (PPRO) | Active |
| 36 | PAGOFACIL | Pago Facil | LATAM-AR | Voucher (PPRO) | Active |
| 37 | ALIPAY | Alipay | APAC-CN | Redirect (PPRO) | Active |
| 38 | WECHATPAY | WeChat Pay | APAC-CN | QR Code (PPRO) | Active |
| 39 | KAKAOPAY | KakaoPay | APAC-KR | Redirect (PPRO) | Active |
| 40 | NAVERPAY | Naver Pay | APAC-KR | Redirect (PPRO) | Active |
| 41 | TOSS | Toss | APAC-KR | Redirect (PPRO) | Active |
| 42 | PAYNOW | PayNow | APAC-SG | QR Code (PPRO) | Active |
| 43 | GRABPAY | GrabPay | APAC-SEA | Redirect (PPRO) | Active |
| 44 | BOOST | Boost | APAC-MY | Redirect (PPRO) | Active |
| 45 | TOUCHNGO | Touch 'n Go | APAC-MY | Redirect (PPRO) | Active |
| 46 | DANA | DANA | APAC-ID | Redirect (PPRO) | Active |
| 47 | OVO | OVO | APAC-ID | Redirect (PPRO) | Active |
| 48 | GCASH | GCash | APAC-PH | Redirect (PPRO) | Active |
| 49 | MAYA | Maya (PayMaya) | APAC-PH | Redirect (PPRO) | Active |
| 50 | PROMPTPAY | PromptPay | APAC-TH | QR Code (PPRO) | Active |
| 51 | TRUEMONEY | TrueMoney | APAC-TH | Redirect (PPRO) | Active |
| 52 | LINEPAY | LINE Pay | APAC-TH/TW/JP | Redirect (PPRO) | Active |
| 53 | PAYPAY | PayPay | APAC-JP | Redirect (PPRO) | Active |

---

## 5. Architecture

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
    ppro/
      ppro-factory.ts    — Parameterized factory for 39 redirect APMs
      ppro-config.ts     — Per-APM configuration (fields, redirect URLs)
    klarna/
      klarna-adapter.ts  — Widget rendering, OSM, session management
    cashapp/
      cashapp-adapter.ts — QR code generation, polling, deep link
    googlepay/
      googlepay-adapter.ts — Google Pay button, payment sheet, tokenization
    applepay/
      applepay-adapter.ts  — Apple Pay session, merchant validation, token
    paypal/
      paypal-adapter.ts    — PayPal Buttons, Messages, order capture
    affirm/
      affirm-adapter.ts   — Affirm checkout redirect, promo messaging
    afterpay/
      afterpay-adapter.ts — Afterpay redirect, installment messaging
    sezzle/
      sezzle-adapter.ts   — Sezzle widget, static promo display
    venmo/
      venmo-adapter.ts    — Venmo redirect via PayPal SDK
    zip/
      zip-adapter.ts      — Zip/QuadPay redirect, promo messaging
  types/
    events.ts            — Event payload type definitions
    errors.ts            — Error structure types
    config.ts            — Configuration types
    adapters.ts          — Adapter interface types
  test/
    api/                 — 239 API integration tests
    unit/                — 49 unit tests
    sweep/               — 53-adapter callback sweep
```

### Adapter Interface

```typescript
interface APMAdapter {
  readonly code: string;
  readonly name: string;
  readonly pattern: 'redirect' | 'widget' | 'qr' | 'native' | 'iframe' | 'static';

  init(config: AdapterConfig): Promise<void>;
  render(container: HTMLElement): Promise<void>;
  authorize(params: AuthorizeParams): Promise<AuthorizeResult>;
  teardown(): void;

  // Event hooks — adapters emit via the injected event bus
  onReady?: () => void;
  onError?: (error: SDKError) => void;
  onUserAction?: (action: UserAction) => void;
}
```

### Public API Flow

```
createCheckout(config)
    |
    v
checkout.on('checkout:ready', ...)    // Subscribe to events
    |
    v
checkout.init()                        // Load provider SDK, validate config
    |                                  // Emits: sdk:loaded, checkout:ready
    v
checkout.render(container)            // Mount button/widget/QR into DOM
    |                                  // Emits: render:start, render:complete
    v
checkout.authorize()                   // User clicks -> payment flow executes
    |                                  // Emits: authorize:start, authorize:complete
    v                                  //   or:  authorize:error
AuthorizeResult { status, transactionId, providerRef }
```

---

## 6. Universal Events (18)

All events follow the pattern `category:action` and carry typed payloads. The event bus enforces ordering constraints (e.g., `render:complete` cannot fire before `sdk:loaded`).

| # | Event | Category | Description | Ordering Constraint |
|---|-------|----------|-------------|---------------------|
| 1 | `sdk:loading` | Lifecycle | Provider SDK script tag injected | First event |
| 2 | `sdk:loaded` | Lifecycle | Provider SDK script executed successfully | After sdk:loading |
| 3 | `sdk:error` | Lifecycle | Provider SDK failed to load | After sdk:loading |
| 4 | `checkout:ready` | Lifecycle | Adapter initialized, ready to render | After sdk:loaded |
| 5 | `checkout:destroyed` | Lifecycle | Adapter teardown complete | Terminal event |
| 6 | `render:start` | Rendering | DOM mounting initiated | After checkout:ready |
| 7 | `render:complete` | Rendering | UI fully rendered and interactive | After render:start |
| 8 | `render:error` | Rendering | Rendering failed | After render:start |
| 9 | `authorize:start` | Payment | Payment authorization initiated | After render:complete |
| 10 | `authorize:complete` | Payment | Payment authorized successfully | After authorize:start |
| 11 | `authorize:error` | Payment | Payment authorization failed | After authorize:start |
| 12 | `authorize:cancel` | Payment | User cancelled payment flow | After authorize:start |
| 13 | `redirect:start` | Navigation | Browser redirect to provider initiated | After authorize:start |
| 14 | `redirect:return` | Navigation | User returned from provider redirect | After redirect:start |
| 15 | `user:interaction` | Analytics | User clicked, scrolled, or engaged with APM UI | After render:complete |
| 16 | `promo:rendered` | Promotional | Promotional messaging widget displayed | After render:complete |
| 17 | `promo:clicked` | Promotional | User clicked promotional messaging | After promo:rendered |
| 18 | `error:unhandled` | Error | Unexpected error not covered by specific events | Any time |

---

## 7. Error Taxonomy (12 Codes)

| Code | Name | Description | Retryable | Retry Policy |
|------|------|-------------|-----------|--------------|
| `APM_001` | SDK_LOAD_FAILED | Provider SDK script failed to load (network error, CDN outage, CSP block) | Yes | 3 retries, exponential backoff (1s, 2s, 4s) |
| `APM_002` | SDK_INIT_FAILED | Provider SDK loaded but initialization failed (invalid config, auth error) | Yes | 2 retries, 2s delay |
| `APM_003` | RENDER_FAILED | UI component failed to mount in DOM (container missing, SDK widget error) | Yes | 1 retry after 500ms |
| `APM_004` | AUTHORIZE_DECLINED | Provider declined the payment (insufficient funds, risk, limits) | No | Surface decline reason to user |
| `APM_005` | AUTHORIZE_TIMEOUT | Payment authorization timed out waiting for provider response | Yes | 1 retry, 5s timeout extension |
| `APM_006` | AUTHORIZE_CANCELLED | User explicitly cancelled the payment flow | No | Allow user to retry manually |
| `APM_007` | REDIRECT_FAILED | Browser redirect to provider failed (URL blocked, popup blocked) | Yes | 1 retry with fallback to same-window redirect |
| `APM_008` | CALLBACK_INVALID | Provider callback/webhook payload failed validation | No | Log and surface to merchant |
| `APM_009` | CONFIG_INVALID | Merchant configuration missing required fields or contains invalid values | No | Surface validation errors |
| `APM_010` | NETWORK_ERROR | Network request to provider API failed (DNS, TLS, connection reset) | Yes | 3 retries, exponential backoff (1s, 2s, 4s) |
| `APM_011` | PROVIDER_UNAVAILABLE | Provider API returned 5xx or is in maintenance mode | Yes | 3 retries, linear backoff (5s, 10s, 15s) |
| `APM_012` | INTERNAL_ERROR | Unexpected SDK error not attributable to provider or network | No | Log full stack trace, surface generic message |

---

## 8. Promotional Messaging

| Provider | Type | Status | Integration | Notes |
|----------|------|--------|-------------|-------|
| Klarna | On-Site Messaging (OSM) | Real SDK | `klarna-osm` component via Klarna SDK | Displays installment pricing dynamically based on cart total. Requires Klarna client ID. |
| PayPal | PayPal Messages | Real SDK | `paypal-messages` component via PayPal JS SDK | Shows Pay Later messaging. Configurable style (text, flex, banner). Requires PayPal client ID. |
| Sezzle | Static Widget | Real SDK | Sezzle widget SDK | Renders installment pricing badge. Lightweight static display with Sezzle branding. |
| Afterpay | Installment Messaging | Simulated | HTML/CSS render | Displays "4 interest-free payments of $X.XX" based on cart total. Styled per Afterpay brand guidelines. |
| Affirm | Promo Messaging | Simulated | HTML/CSS render | Displays "Starting at $X/mo with Affirm" based on cart total and estimated APR. |
| Zip | Pay-in-4 Messaging | Simulated | HTML/CSS render | Displays "4 interest-free payments of $X.XX" with Zip branding. |

---

## 9. Sandbox Test Data

### Klarna

| Scenario | Email | Expected Result |
|----------|-------|-----------------|
| Approved | `customer@email.com` | Payment approved |
| Denied | `denied@email.com` | Payment declined |
| Pending | `pending@email.com` | Payment pending review |

### CashApp Pay

| Scenario | Amount | Expected Result |
|----------|--------|-----------------|
| Approved | `$1.00` | QR scan succeeds, payment approved |
| Declined | `$0.01` | Payment declined after QR scan |
| Timeout | `$99.99` | QR code expires, timeout error |

### PPRO — BLIK

| Scenario | Code | Expected Result |
|----------|------|-----------------|
| Approved | `123456` | BLIK payment approved |
| Declined | `000000` | BLIK payment declined |

### Afterpay

| Scenario | Card Number | Expected Result |
|----------|-------------|-----------------|
| Approved | `4111 1111 1111 1111` | Afterpay checkout approved |
| Declined | `4000 0000 0000 0002` | Afterpay checkout declined |

### Affirm

| Scenario | Code | Expected Result |
|----------|------|-----------------|
| Approved | Use sandbox auto-approve | Affirm checkout approved |
| Declined | Use sandbox auto-decline | Affirm checkout declined |

### Apple Pay

| Scenario | Card Number | Expected Result |
|----------|-------------|-----------------|
| Approved | `4761 1200 1000 0492` | Apple Pay authorized |
| Declined | `4000 0000 0000 0002` | Apple Pay declined |
| 3DS Required | `4000 0000 0000 3220` | 3DS challenge presented |

### Google Pay

| Scenario | Environment | Expected Result |
|----------|-------------|-----------------|
| Test Mode | `TEST` | Returns test payment token |
| Production | `PRODUCTION` | Returns real payment token (requires merchant ID) |

---

## 10. Rollout Plan

### Phase 1: US Sprint 1-3 (10 APMs)

| Sprint | APMs | Focus |
|--------|------|-------|
| Sprint 1 | Google Pay, Apple Pay, PayPal | Native SDK integrations, highest US coverage |
| Sprint 2 | Klarna, Affirm, Afterpay | BNPL providers, promotional messaging |
| Sprint 3 | CashApp, Venmo, Sezzle, Zip | QR code, wallet, remaining US BNPL |

**Exit criteria:** 10/10 adapters passing callback sweep, promotional messaging live for BNPL providers, sandbox e2e validated.

### Phase 2: Europe Sprint 4-6 (16 APMs)

| Sprint | APMs | Focus |
|--------|------|-------|
| Sprint 4 | iDEAL, Bancontact, Sofort, Giropay, EPS | Western Europe bank transfers |
| Sprint 5 | P24, BLIK, Trustly, Swish, Vipps, MobilePay | Northern/Eastern Europe |
| Sprint 6 | Multibanco, MB WAY, Satispay, MyBank, TWINT | Southern Europe/Switzerland |

**Exit criteria:** 16/16 PPRO adapters passing, redirect flows validated across all providers.

### Phase 3: LATAM Sprint 7-8 (10 APMs)

| Sprint | APMs | Focus |
|--------|------|-------|
| Sprint 7 | PIX, Boleto, OXXO, SPEI, PSE | Brazil and Mexico core methods |
| Sprint 8 | Efecty, Webpay, Khipu, Rapipago, Pago Facil | Colombia, Chile, Argentina |

**Exit criteria:** 10/10 LATAM adapters passing, QR and voucher patterns validated.

### Phase 4: APAC Sprint 9-12 (17 APMs)

| Sprint | APMs | Focus |
|--------|------|-------|
| Sprint 9 | Alipay, WeChat Pay, KakaoPay, Naver Pay | China and Korea |
| Sprint 10 | Toss, PayNow, GrabPay, Boost | Korea/Singapore/SEA |
| Sprint 11 | Touch 'n Go, DANA, OVO, GCash, Maya | SEA wallets |
| Sprint 12 | PromptPay, TrueMoney, LINE Pay, PayPay | Thailand, Taiwan, Japan |

**Exit criteria:** All 53/53 adapters passing callback sweep, full regional coverage validated.

---

## 11. Acceptance Criteria

### Test Coverage Requirements

| Test Suite | Count | Requirement | Status |
|-----------|-------|-------------|--------|
| API Integration Tests | 239/239 | All passing | PASS |
| Unit Tests | 49/49 | All passing | PASS |
| Callback Sweep | 53/53 | All adapters respond to init/render/authorize/teardown | PASS |

### Per-Adapter Validation

Each of the 53 adapters must satisfy:

- **Callback sweep:** `init()`, `render()`, `authorize()`, and `teardown()` execute without throwing.
- **Styling assertions:** 22 assertions per APM verifying brand compliance (logo dimensions, color values, font family, border radius, padding, responsive breakpoints, dark mode, hover states, focus indicators, loading spinners, error state styling, disabled state, container sizing, z-index layering, animation timing, button height, minimum tap target, contrast ratio, RTL support, overflow handling, shadow values, opacity transitions).
- **Event ordering:** All emitted events respect ordering constraints defined in the event bus.
- **Error mapping:** Provider-specific errors map correctly to one of the 12 SDK error codes.
- **Timeout handling:** Operations that exceed configured timeouts emit appropriate timeout errors.

### Integration Validation

- Public API contract (`createCheckout` -> `on` -> `init` -> `render` -> `authorize`) works end-to-end for all 6 patterns.
- Event bus delivers events to all subscribers in correct order.
- Multiple APMs can be initialized on the same page without interference.
- Teardown fully releases DOM elements, event listeners, and provider SDK resources.

---

## 12. Effort Estimates

### Per-APM Effort Comparison

| Activity | Without Framework | With Framework |
|----------|-------------------|----------------|
| Requirements gathering | 3-5 days | 0.5 days (config-driven) |
| Architecture | 3-5 days | 0 days (adapter interface) |
| Callback wiring | 3-5 days | 0.5 days (event bus) |
| Data transformation | 2-3 days | 0.5 days (shared mappers) |
| Error handling | 2-3 days | 0 days (error taxonomy) |
| Styling | 3-5 days | 0.5 days (brand config) |
| Testing | 5-7 days | 0.5 days (test harness) |
| **Total** | **21-33 days (4-6 weeks)** | **2.5 days (~2-3 days)** |

### PPRO Factory APMs

PPRO factory APMs require even less effort since the adapter logic is fully parameterized:

| Activity | Effort |
|----------|--------|
| Add configuration object | 0.5 days |
| Sandbox validation | 0.5 days |
| **Total per PPRO APM** | **1 day** |

### Full Rollout Projection

| Scenario | Engineers | Duration |
|----------|-----------|----------|
| 53 APMs without framework | 2 | 2-3 years |
| 53 APMs with framework (14 direct + 39 PPRO) | 2 | 3-4 months |
| **Acceleration factor** | — | **6-9x faster** |

### Breakdown

- 14 direct-integration adapters x 2.5 days = 35 engineering days
- 39 PPRO factory adapters x 1 day = 39 engineering days
- Framework core (event bus, error taxonomy, test harness) = 20 engineering days
- Total = 94 engineering days
- With 2 engineers working in parallel = ~47 working days = ~2.5 months
- Adding buffer for sandbox issues, provider coordination, and edge cases = **3-4 months**

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| APM | Alternative Payment Method — any payment method other than traditional credit/debit cards |
| Adapter | A module implementing the APMAdapter interface for a specific payment provider |
| PPRO | Payment infrastructure provider that aggregates 39+ redirect-based APMs behind a single API |
| OSM | On-Site Messaging — promotional widgets displayed on product/cart pages |
| Callback Sweep | Automated test that exercises init/render/authorize/teardown across all 53 adapters |
| BNPL | Buy Now Pay Later — installment payment providers (Klarna, Affirm, Afterpay, Sezzle, Zip) |

---

## Appendix B: Open Questions

1. **Apple Pay merchant validation:** Production merchant ID provisioning timeline and certificate rotation strategy.
2. **PPRO sandbox parity:** Confirm all 39 PPRO APMs have functional sandbox environments for e2e testing.
3. **Rate limiting:** Define per-provider rate limit handling and circuit breaker thresholds.
4. **Analytics integration:** Confirm event bus payload schema aligns with downstream analytics pipeline.
5. **Accessibility:** WCAG 2.1 AA compliance audit for all rendered components across 53 APMs.

---

*End of document.*
