/**
 * @commercehub/checkout-sdk — Universal APM Checkout SDK
 *
 * 53 payment methods, 6 patterns, 18 universal events.
 * TypeScript-first, event-driven, plugin-based.
 */

// Core exports
export { CheckoutManager, createCheckout } from './core/checkout-manager.js';
export { CheckoutEventBus } from './core/event-bus.js';
export { AdapterRegistry, globalRegistry } from './core/adapter-registry.js';
export { createPproAdapter } from './core/ppro-adapter-factory.js';

// Types
export {
  CONTRACT_VERSION,
  UniversalEventType,
  TERMINAL_EVENTS,
  ErrorCode,
  DEFAULT_TIMEOUTS,
} from './core/types.js';

export type {
  APMAdapter,
  APMPattern,
  CheckoutConfig,
  CheckoutEvent,
  ErrorObject,
  EventBus,
  SDKMetadata,
  ServerHandoff,
  PaymentData,
  RenderOptions,
  Amount,
  Address,
  LineItem,
  ReturnUrls,
  PproAdapterConfig,
} from './core/types.js';

// Transform utilities
export {
  multiply100,
  divide100,
  numberToString,
  stringToNumber,
  decimalToStringCents,
  stringCentsToDecimal,
  mapEnum,
  concat,
  passthrough,
  validateAmount,
  validateCurrency,
  applyTransform,
} from './core/transform-utils.js';

// Auto-register all 53 adapters — import this to make all APMs available
export { REGISTERED_COUNT, allAdapters } from './register-all.js';
