import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createApplepayAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'applepay', data, timestamp: new Date().toISOString() });
    }
    return {
        id: 'applepay',
        displayName: 'Apple Pay',
        pattern: 'native-wallet',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.SHIPPING_ADDRESS_CHANGED,
            UniversalEventType.SHIPPING_METHOD_CHANGED,
            UniversalEventType.COUPON_CODE_CHANGED,
            UniversalEventType.PAYMENT_METHOD_SELECTED,
        ],
        sdkMetadata: { version: '1.0', loadMethod: 'payment-request-api' },
        async loadSDK() { },
        async init(cfg, bus) { config = cfg; eventBus = bus; initialized = true; },
        async render(container) {
            const btn = document.createElement('apple-pay-button');
            btn.setAttribute('buttonstyle', 'black');
            btn.setAttribute('type', 'buy');
            btn.setAttribute('locale', config?.locale ?? 'en-US');
            btn.style.cssText = 'display:block;width:100%;height:48px;cursor:pointer;--apple-pay-button-width:100%;--apple-pay-button-height:48px;';
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
                // In production, this would create an ApplePaySession. Mocked for SDK layer.
                const resp = await fetch('/api/applepay/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId }),
                });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_AUTHORIZED, { paymentToken: data._raw?.paymentToken, transactionId: data.transactionProcessingDetails?.transactionId });
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
            }
        },
        async handleRedirectReturn(_queryParams) {
            // Apple Pay uses native sheet, no redirect return needed
        },
        getServerHandoff() { return { endpoint: '/api/applepay/session', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
        mapConfig(chConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
        teardown() { eventBus = null; config = null; lastResponse = null; initialized = false; },
    };
}
export const applepayAdapter = createApplepayAdapter();
//# sourceMappingURL=applepay-adapter.js.map