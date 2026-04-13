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
export var UniversalEventType;
(function (UniversalEventType) {
    // Category 1: Payment Lifecycle (9)
    UniversalEventType["PAYMENT_METHOD_READY"] = "PAYMENT_METHOD_READY";
    UniversalEventType["PAYMENT_AUTHORIZED"] = "PAYMENT_AUTHORIZED";
    UniversalEventType["PAYMENT_ERROR"] = "PAYMENT_ERROR";
    UniversalEventType["PAYMENT_CANCELLED"] = "PAYMENT_CANCELLED";
    UniversalEventType["REDIRECT_REQUIRED"] = "REDIRECT_REQUIRED";
    UniversalEventType["QR_CODE_GENERATED"] = "QR_CODE_GENERATED";
    UniversalEventType["VOUCHER_CODE_GENERATED"] = "VOUCHER_CODE_GENERATED";
    UniversalEventType["VOUCHER_EXPIRED"] = "VOUCHER_EXPIRED";
    UniversalEventType["PHONE_NUMBER_REQUIRED"] = "PHONE_NUMBER_REQUIRED";
    // Category 2: Customer Data Changes (5)
    UniversalEventType["SHIPPING_ADDRESS_CHANGED"] = "SHIPPING_ADDRESS_CHANGED";
    UniversalEventType["SHIPPING_METHOD_CHANGED"] = "SHIPPING_METHOD_CHANGED";
    UniversalEventType["COUPON_CODE_CHANGED"] = "COUPON_CODE_CHANGED";
    UniversalEventType["PAYMENT_METHOD_SELECTED"] = "PAYMENT_METHOD_SELECTED";
    UniversalEventType["BILLING_ADDRESS_CHANGED"] = "BILLING_ADDRESS_CHANGED";
    // Category 3: UI / Widget (3)
    UniversalEventType["WIDGET_HEIGHT_CHANGED"] = "WIDGET_HEIGHT_CHANGED";
    UniversalEventType["WIDGET_OVERLAY_SHOWN"] = "WIDGET_OVERLAY_SHOWN";
    UniversalEventType["WIDGET_OVERLAY_HIDDEN"] = "WIDGET_OVERLAY_HIDDEN";
    // Category 4: Promotional Messaging (3) — removed from this enum, handled separately
    // PROMO_MESSAGE_RENDERED, PROMO_MESSAGE_CLICKED, PROMO_AMOUNT_UPDATED
    // These are promo-widget specific and not part of the payment adapter contract.
})(UniversalEventType || (UniversalEventType = {}));
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
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["SCRIPT_LOAD_FAILED"] = "SCRIPT_LOAD_FAILED";
    ErrorCode["INIT_FAILED"] = "INIT_FAILED";
    ErrorCode["RENDER_FAILED"] = "RENDER_FAILED";
    ErrorCode["AUTH_FAILED"] = "AUTH_FAILED";
    ErrorCode["AUTH_TIMEOUT"] = "AUTH_TIMEOUT";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["REDIRECT_FAILED"] = "REDIRECT_FAILED";
    ErrorCode["QR_EXPIRED"] = "QR_EXPIRED";
    ErrorCode["VOUCHER_GENERATION_FAILED"] = "VOUCHER_GENERATION_FAILED";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    ErrorCode["UNSUPPORTED_BROWSER"] = "UNSUPPORTED_BROWSER";
})(ErrorCode || (ErrorCode = {}));
// ---------------------------------------------------------------------------
// Timeout Defaults (milliseconds)
// ---------------------------------------------------------------------------
export const DEFAULT_TIMEOUTS = {
    scriptLoad: 10000,
    init: 5000,
    render: 8000,
    auth: 30000,
    handoff: 15000,
    // Polling timeouts are per-APM, set in adapter config
    pollInterval: {
        'redirect-wallet': 2000,
        'qr-code': 3000,
        'voucher-cash': 300000, // 5 minutes
    },
    pollMaxDuration: {
        'redirect-wallet': 900000, // 15 minutes
        'qr-code': 3600000, // 60 minutes
        'voucher-cash': 259200000, // 72 hours
    },
    retryBackoff: [1000, 2000, 4000], // exponential backoff for script loading
};
//# sourceMappingURL=types.js.map