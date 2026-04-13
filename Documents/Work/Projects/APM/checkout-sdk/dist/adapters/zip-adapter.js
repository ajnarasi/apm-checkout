import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createZipAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'zip', data, timestamp: new Date().toISOString() });
    }
    return {
        id: 'zip',
        displayName: 'Zip',
        pattern: 'server-bnpl',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.WIDGET_OVERLAY_SHOWN,
            UniversalEventType.WIDGET_OVERLAY_HIDDEN,
        ],
        sdkMetadata: { version: '1.0', loadMethod: 'none' },
        async loadSDK() { },
        async init(cfg, bus) { config = cfg; eventBus = bus; initialized = true; },
        async render(container) {
            const btn = document.createElement('button');
            btn.textContent = 'Pay with Zip';
            btn.style.cssText = 'background:#7B2DBF;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
            container.innerHTML = '';
            container.appendChild(btn);
        },
        async authorize(paymentData) {
            if (!initialized || !eventBus)
                throw new Error('Adapter not initialized. Call init() before authorize()');
            try {
                validateAmount(paymentData.amount.total);
                validateCurrency(paymentData.amount.currency ?? 'USD');
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
                return;
            }
            try {
                const resp = await fetch('/api/zip/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
                });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_METHOD_READY, { checkoutId: data._raw?.id || data.transactionProcessingDetails?.transactionId });
                // Zip uses an overlay/iframe checkout modal
                emit(UniversalEventType.WIDGET_OVERLAY_SHOWN, { checkoutId: data._raw?.id });
                // In production, Zip SDK handles the overlay. Here we simulate authorization.
                emit(UniversalEventType.PAYMENT_AUTHORIZED, { checkoutId: data._raw?.id, transactionId: data.transactionProcessingDetails?.transactionId });
                emit(UniversalEventType.WIDGET_OVERLAY_HIDDEN, {});
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
            }
        },
        async handleRedirectReturn(queryParams) {
            if (!initialized || !eventBus)
                return;
            const checkoutId = queryParams.checkoutId || queryParams.id;
            if (checkoutId)
                emit(UniversalEventType.PAYMENT_AUTHORIZED, { checkoutId });
        },
        getServerHandoff() { return { endpoint: '/api/zip/checkout', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
        mapConfig(chConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
        teardown() { eventBus = null; config = null; lastResponse = null; initialized = false; },
    };
}
export const zipAdapter = createZipAdapter();
//# sourceMappingURL=zip-adapter.js.map