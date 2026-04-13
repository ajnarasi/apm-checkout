/**
 * Universal APM Checkout SDK — Type Definitions
 * Contract Version: 1.0.0
 *
 * 18 universal events across 5 categories, 12 error codes, 7 timeout operations.
 * All adapters declare contractVersion and the registry validates compatibility.
 */

// ---------------------------------------------------------------------------
// Contract Version
// ---------------------------------------------------------------------------

export const CONTRACT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Universal Event Types — 18 events across 5 categories
// ---------------------------------------------------------------------------

export enum UniversalEventType {
  // Category 1: Payment Lifecycle (9)
  PAYMENT_METHOD_READY = 'PAYMENT_METHOD_READY',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',
  REDIRECT_REQUIRED = 'REDIRECT_REQUIRED',
  QR_CODE_GENERATED = 'QR_CODE_GENERATED',
  VOUCHER_CODE_GENERATED = 'VOUCHER_CODE_GENERATED',
  VOUCHER_EXPIRED = 'VOUCHER_EXPIRED',
  PHONE_NUMBER_REQUIRED = 'PHONE_NUMBER_REQUIRED',

  // Category 2: Customer Data Changes (5)
  SHIPPING_ADDRESS_CHANGED = 'SHIPPING_ADDRESS_CHANGED',
  SHIPPING_METHOD_CHANGED = 'SHIPPING_METHOD_CHANGED',
  COUPON_CODE_CHANGED = 'COUPON_CODE_CHANGED',
  PAYMENT_METHOD_SELECTED = 'PAYMENT_METHOD_SELECTED',
  BILLING_ADDRESS_CHANGED = 'BILLING_ADDRESS_CHANGED',

  // Category 3: UI / Widget (3)
  WIDGET_HEIGHT_CHANGED = 'WIDGET_HEIGHT_CHANGED',
  WIDGET_OVERLAY_SHOWN = 'WIDGET_OVERLAY_SHOWN',
  WIDGET_OVERLAY_HIDDEN = 'WIDGET_OVERLAY_HIDDEN',

  // Category 4: Promotional Messaging (3) — removed from this enum, handled separately
  // PROMO_MESSAGE_RENDERED, PROMO_MESSAGE_CLICKED, PROMO_AMOUNT_UPDATED
  // These are promo-widget specific and not part of the payment adapter contract.
}

/**
 * Terminal events — exactly one of these fires to end a payment flow.
 * Event ordering: PAYMENT_METHOD_READY → flow-specific → interaction → terminal
 */
export const TERMINAL_EVENTS = new Set([
  UniversalEventType.PAYMENT_AUTHORIZED,
  UniversalEventType.PAYMENT_CANCELLED,
  UniversalEventType.PAYMENT_ERROR,
  UniversalEventType.VOUCHER_EXPIRED,
]);

// ---------------------------------------------------------------------------
// Error Taxonomy — 12 error codes
// ---------------------------------------------------------------------------

export enum ErrorCode {
  SCRIPT_LOAD_FAILED = 'SCRIPT_LOAD_FAILED',
  INIT_FAILED = 'INIT_FAILED',
  RENDER_FAILED = 'RENDER_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_TIMEOUT = 'AUTH_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  REDIRECT_FAILED = 'REDIRECT_FAILED',
  QR_EXPIRED = 'QR_EXPIRED',
  VOUCHER_GENERATION_FAILED = 'VOUCHER_GENERATION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  UNSUPPORTED_BROWSER = 'UNSUPPORTED_BROWSER',
}

export interface ErrorObject {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Event Payload
// ---------------------------------------------------------------------------

export interface CheckoutEvent<T = Record<string, unknown>> {
  type: UniversalEventType;
  apm: string;
  data: T;
  rawData?: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// APM Pattern
// ---------------------------------------------------------------------------

export type APMPattern =
  | 'bank-redirect'
  | 'redirect-wallet'
  | 'qr-code'
  | 'voucher-cash'
  | 'server-bnpl'
  | 'native-wallet';

// ---------------------------------------------------------------------------
// SDK Metadata
// ---------------------------------------------------------------------------

export interface SDKMetadata {
  cdnUrl?: string;
  npmPackage?: string;
  version: string;
  loadMethod: 'async-script' | 'dynamic-import' | 'payment-request-api' | 'none';
  globalVariable?: string;
  cspScriptSrc?: string[];
  cspConnectSrc?: string[];
}

// ---------------------------------------------------------------------------
// Checkout Configuration
// ---------------------------------------------------------------------------

export interface Amount {
  total: number;
  currency: string;
}

export interface Address {
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface LineItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  taxAmount?: number;
  sku?: string;
  productUrl?: string;
  imageUrl?: string;
}

export interface ReturnUrls {
  successUrl: string;
  cancelUrl?: string;
  errorUrl?: string;
}

export interface CheckoutConfig {
  apm: string;
  containerId?: string;
  amount: Amount;
  items?: LineItem[];
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  shippingAddress?: Address;
  billingAddress?: Address;
  merchantOrderId?: string;
  merchantId?: string;
  returnUrls?: ReturnUrls;
  credentials?: Record<string, string>;
  locale?: string;
  style?: Record<string, unknown>;
  // Timeout overrides
  scriptTimeout?: number;
  initTimeout?: number;
  renderTimeout?: number;
  authTimeout?: number;
  handoffTimeout?: number;
  // Dual-mode override (Swish, Alipay, PayPay)
  forceMode?: 'redirect' | 'qr';
}

// ---------------------------------------------------------------------------
// Render Options
// ---------------------------------------------------------------------------

export interface RenderOptions {
  buttonStyle?: Record<string, unknown>;
  buttonType?: string;
  locale?: string;
}

// ---------------------------------------------------------------------------
// Server Handoff
// ---------------------------------------------------------------------------

export interface ServerHandoff {
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT';
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Payment Data (input to authorize)
// ---------------------------------------------------------------------------

export interface PaymentData {
  amount: Amount;
  currency?: string;
  merchantOrderId?: string;
  customer?: CheckoutConfig['customer'];
  shippingAddress?: Address;
  billingAddress?: Address;
  items?: LineItem[];
  returnUrls?: ReturnUrls;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Timeout Defaults (milliseconds)
// ---------------------------------------------------------------------------

export const DEFAULT_TIMEOUTS = {
  scriptLoad: 10_000,
  init: 5_000,
  render: 8_000,
  auth: 30_000,
  handoff: 15_000,
  // Polling timeouts are per-APM, set in adapter config
  pollInterval: {
    'redirect-wallet': 2_000,
    'qr-code': 3_000,
    'voucher-cash': 300_000, // 5 minutes
  },
  pollMaxDuration: {
    'redirect-wallet': 900_000,  // 15 minutes
    'qr-code': 3_600_000,       // 60 minutes
    'voucher-cash': 259_200_000, // 72 hours
  },
  retryBackoff: [1_000, 2_000, 4_000], // exponential backoff for script loading
} as const;

// ---------------------------------------------------------------------------
// APM Adapter Interface
// ---------------------------------------------------------------------------

export interface EventBus {
  emit<T = Record<string, unknown>>(event: CheckoutEvent<T>): void;
  on(type: UniversalEventType, handler: (event: CheckoutEvent) => void): void;
  off(type: UniversalEventType, handler?: (event: CheckoutEvent) => void): void;
  isSupported(type: UniversalEventType): boolean;
}

export interface APMAdapter {
  // Identity
  readonly id: string;
  readonly displayName: string;
  readonly pattern: APMPattern;
  readonly contractVersion: string;
  readonly supportedEvents: ReadonlyArray<UniversalEventType>;

  // SDK Metadata
  readonly sdkMetadata: SDKMetadata;

  // Lifecycle
  loadSDK(config: CheckoutConfig): Promise<void>;
  init(config: CheckoutConfig, eventBus: EventBus): Promise<void>;
  render(container: HTMLElement, options?: RenderOptions): Promise<void>;

  // Auth — single trigger, events signal completion
  authorize(paymentData: PaymentData): Promise<void>;
  handleRedirectReturn(queryParams: Record<string, string>): Promise<void>;

  // Handoff
  getServerHandoff(): ServerHandoff;

  // Config
  mapConfig(chConfig: CheckoutConfig): Record<string, unknown>;

  // Cleanup
  teardown(): void;
}

// ---------------------------------------------------------------------------
// PPRO Adapter Config (for factory)
// ---------------------------------------------------------------------------

export interface PproAdapterConfig {
  code: string;
  displayName: string;
  country: string;
  currency: string;
  pattern: APMPattern;
  brandColor: string;
  buttonLabel: string;
  logoUrl: string;
  authType: 'REDIRECT' | 'SCAN_CODE';
  bankSelection?: boolean;
  supportedBanks?: string[];
  inputField?: { type: string; maxLength: number; placeholder: string };
  phoneInput?: boolean;
  dualMode?: boolean;
  voucherExpiry?: string;
  storeSelection?: boolean;
  pollInterval?: number;
  pollMaxDuration?: number;
}
