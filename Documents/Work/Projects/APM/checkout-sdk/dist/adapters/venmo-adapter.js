import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createVenmoAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'venmo', data, timestamp: new Date().toISOString() });
    }
    return {
        id: 'venmo',
        displayName: 'Venmo',
        pattern: 'redirect-wallet',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.REDIRECT_REQUIRED,
        ],
        sdkMetadata: { version: '1.0', loadMethod: 'none' },
        async loadSDK() { },
        async init(cfg, bus) { config = cfg; eventBus = bus; initialized = true; },
        async render(container) {
            const btn = document.createElement('button');
            btn.textContent = 'Pay with Venmo';
            btn.style.cssText = 'background:#3D95CE;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
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
                const resp = await fetch('/api/venmo/tokenize', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
                });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_METHOD_READY, { nonce: data._raw?.nonce || data.transactionProcessingDetails?.transactionId });
                const redirectUrl = data.checkoutInteractions?.actions?.url || data._raw?.redirectUrl;
                if (redirectUrl)
                    emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl, nonce: data._raw?.nonce });
                else
                    emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No redirect URL', retryable: false });
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
            }
        },
        async handleRedirectReturn(queryParams) {
            if (!initialized || !eventBus)
                return;
            const nonce = queryParams.nonce || queryParams.payment_method_nonce;
            if (!nonce) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing nonce', retryable: false });
                return;
            }
            emit(UniversalEventType.PAYMENT_AUTHORIZED, { nonce });
        },
        getServerHandoff() { return { endpoint: '/api/venmo/tokenize', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
        mapConfig(chConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
        teardown() { eventBus = null; config = null; lastResponse = null; initialized = false; },
    };
}
export const venmoAdapter = createVenmoAdapter();
//# sourceMappingURL=venmo-adapter.js.map