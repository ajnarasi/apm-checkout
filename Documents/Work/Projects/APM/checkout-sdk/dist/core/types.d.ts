/**
 * Universal APM Checkout SDK — Type Definitions
 * Contract Version: 1.0.0
 *
 * 18 universal events across 5 categories, 12 error codes, 7 timeout operations.
 * All adapters declare contractVersion and the registry validates compatibility.
 */
export declare const CONTRACT_VERSION = "1.0.0";
export declare enum UniversalEventType {
    PAYMENT_METHOD_READY = "PAYMENT_METHOD_READY",
    PAYMENT_AUTHORIZED = "PAYMENT_AUTHORIZED",
    PAYMENT_ERROR = "PAYMENT_ERROR",
    PAYMENT_CANCELLED = "PAYMENT_CANCELLED",
    REDIRECT_REQUIRED = "REDIRECT_REQUIRED",
    QR_CODE_GENERATED = "QR_CODE_GENERATED",
    VOUCHER_CODE_GENERATED = "VOUCHER_CODE_GENERATED",
    VOUCHER_EXPIRED = "VOUCHER_EXPIRED",
    PHONE_NUMBER_REQUIRED = "PHONE_NUMBER_REQUIRED",
    SHIPPING_ADDRESS_CHANGED = "SHIPPING_ADDRESS_CHANGED",
    SHIPPING_METHOD_CHANGED = "SHIPPING_METHOD_CHANGED",
    COUPON_CODE_CHANGED = "COUPON_CODE_CHANGED",
    PAYMENT_METHOD_SELECTED = "PAYMENT_METHOD_SELECTED",
    BILLING_ADDRESS_CHANGED = "BILLING_ADDRESS_CHANGED",
    WIDGET_HEIGHT_CHANGED = "WIDGET_HEIGHT_CHANGED",
    WIDGET_OVERLAY_SHOWN = "WIDGET_OVERLAY_SHOWN",
    WIDGET_OVERLAY_HIDDEN = "WIDGET_OVERLAY_HIDDEN"
}
/**
 * Terminal events — exactly one of these fires to end a payment flow.
 * Event ordering: PAYMENT_METHOD_READY → flow-specific → interaction → terminal
 */
export declare const TERMINAL_EVENTS: Set<UniversalEventType>;
export declare enum ErrorCode {
    SCRIPT_LOAD_FAILED = "SCRIPT_LOAD_FAILED",
    INIT_FAILED = "INIT_FAILED",
    RENDER_FAILED = "RENDER_FAILED",
    AUTH_FAILED = "AUTH_FAILED",
    AUTH_TIMEOUT = "AUTH_TIMEOUT",
    NETWORK_ERROR = "NETWORK_ERROR",
    REDIRECT_FAILED = "REDIRECT_FAILED",
    QR_EXPIRED = "QR_EXPIRED",
    VOUCHER_GENERATION_FAILED = "VOUCHER_GENERATION_FAILED",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    UNSUPPORTED_BROWSER = "UNSUPPORTED_BROWSER"
}
export interface ErrorObject {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
}
export interface CheckoutEvent<T = Record<string, unknown>> {
    type: UniversalEventType;
    apm: string;
    data: T;
    rawData?: Record<string, unknown>;
    timestamp: string;
}
export type APMPattern = 'bank-redirect' | 'redirect-wallet' | 'qr-code' | 'voucher-cash' | 'server-bnpl' | 'native-wallet';
export interface SDKMetadata {
    cdnUrl?: string;
    npmPackage?: string;
    version: string;
    loadMethod: 'async-script' | 'dynamic-import' | 'payment-request-api' | 'none';
    globalVariable?: string;
    cspScriptSrc?: string[];
    cspConnectSrc?: string[];
}
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
    scriptTimeout?: number;
    initTimeout?: number;
    renderTimeout?: number;
    authTimeout?: number;
    handoffTimeout?: number;
    forceMode?: 'redirect' | 'qr';
}
export interface RenderOptions {
    buttonStyle?: Record<string, unknown>;
    buttonType?: string;
    locale?: string;
}
export interface ServerHandoff {
    endpoint: string;
    method: 'POST' | 'GET' | 'PUT';
    body: Record<string, unknown>;
    headers?: Record<string, string>;
}
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
export declare const DEFAULT_TIMEOUTS: {
    readonly scriptLoad: 10000;
    readonly init: 5000;
    readonly render: 8000;
    readonly auth: 30000;
    readonly handoff: 15000;
    readonly pollInterval: {
        readonly 'redirect-wallet': 2000;
        readonly 'qr-code': 3000;
        readonly 'voucher-cash': 300000;
    };
    readonly pollMaxDuration: {
        readonly 'redirect-wallet': 900000;
        readonly 'qr-code': 3600000;
        readonly 'voucher-cash': 259200000;
    };
    readonly retryBackoff: readonly [1000, 2000, 4000];
};
export interface EventBus {
    emit<T = Record<string, unknown>>(event: CheckoutEvent<T>): void;
    on(type: UniversalEventType, handler: (event: CheckoutEvent) => void): void;
    off(type: UniversalEventType, handler?: (event: CheckoutEvent) => void): void;
    isSupported(type: UniversalEventType): boolean;
}
export interface APMAdapter {
    readonly id: string;
    readonly displayName: string;
    readonly pattern: APMPattern;
    readonly contractVersion: string;
    readonly supportedEvents: ReadonlyArray<UniversalEventType>;
    readonly sdkMetadata: SDKMetadata;
    loadSDK(config: CheckoutConfig): Promise<void>;
    init(config: CheckoutConfig, eventBus: EventBus): Promise<void>;
    render(container: HTMLElement, options?: RenderOptions): Promise<void>;
    authorize(paymentData: PaymentData): Promise<void>;
    handleRedirectReturn(queryParams: Record<string, string>): Promise<void>;
    getServerHandoff(): ServerHandoff;
    mapConfig(chConfig: CheckoutConfig): Record<string, unknown>;
    teardown(): void;
}
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
    inputField?: {
        type: string;
        maxLength: number;
        placeholder: string;
    };
    phoneInput?: boolean;
    dualMode?: boolean;
    voucherExpiry?: string;
    storeSelection?: boolean;
    pollInterval?: number;
    pollMaxDuration?: number;
}
//# sourceMappingURL=types.d.ts.map