import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createAfterpayAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'afterpay', data, timestamp: new Date().toISOString() });
    }
    return {
        id: 'afterpay',
        displayName: 'Afterpay',
        pattern: 'server-bnpl',
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
            btn.textContent = 'Pay with Afterpay';
            btn.style.cssText = 'background:#00D98B;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
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
                const resp = await fetch('/api/afterpay/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
                });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_METHOD_READY, { token: data._raw?.token });
                const redirectUrl = data.checkoutInteractions?.actions?.url || data._raw?.redirectCheckoutUrl;
                if (redirectUrl)
                    emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl, token: data._raw?.token });
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
            const orderToken = queryParams.orderToken;
            const status = queryParams.status;
            if (status === 'CANCELLED') {
                emit(UniversalEventType.PAYMENT_CANCELLED, { orderToken });
                return;
            }
            if (!orderToken) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing orderToken', retryable: false });
                return;
            }
            try {
                const resp = await fetch('/api/afterpay/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: orderToken }) });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_AUTHORIZED, { orderId: data.transactionProcessingDetails?.transactionId, orderToken });
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
            }
        },
        getServerHandoff() { return { endpoint: '/api/afterpay/capture', method: 'POST', body: { token: lastResponse?._raw?.token, amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
        mapConfig(chConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
        teardown() { eventBus = null; config = null; lastResponse = null; initialized = false; },
    };
}
export const afterpayAdapter = createAfterpayAdapter();
//# sourceMappingURL=afterpay-adapter.js.map