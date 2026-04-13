/**
 * PayPal Pay Later Adapter — Server BNPL pattern
 * SDK: https://www.paypal.com/sdk/js?client-id=sb&enable-funding=paylater&components=buttons,messages
 * Button: paypal.FUNDING.PAYLATER funding source
 * Sandbox: client-id=sb (no signup needed)
 *
 * Pay Later lets customers pay in 4 installments or get monthly financing.
 * Promotional messaging shows "Pay in 4" or "Pay Monthly" based on amount.
 */
import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createPaypalPaylaterAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'paypal-paylater', data, timestamp: new Date().toISOString() });
    }
    return {
        id: 'paypal-paylater',
        displayName: 'PayPal Pay Later',
        pattern: 'server-bnpl',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.SHIPPING_ADDRESS_CHANGED,
            UniversalEventType.SHIPPING_METHOD_CHANGED,
        ],
        sdkMetadata: {
            cdnUrl: 'https://www.paypal.com/sdk/js?client-id=sb&enable-funding=paylater&components=buttons,messages',
            version: '5.x',
            loadMethod: 'async-script',
            globalVariable: 'window.paypal',
            cspScriptSrc: ['https://www.paypal.com'],
            cspConnectSrc: ['https://www.sandbox.paypal.com'],
        },
        async loadSDK() { },
        async init(cfg, bus) {
            config = cfg;
            eventBus = bus;
            initialized = true;
        },
        async render(container) {
            container.innerHTML = '';
            // Pay Later button
            const btn = document.createElement('button');
            btn.textContent = 'Pay Later with PayPal';
            btn.style.cssText = 'background:#003087;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
            container.appendChild(btn);
            // Promotional messaging placeholder
            const promoDiv = document.createElement('div');
            promoDiv.id = 'paypal-paylater-promo';
            promoDiv.style.cssText = 'margin-top:8px;padding:8px;background:#f5f7fa;border-radius:4px;text-align:center;font-size:13px;color:#333;';
            promoDiv.textContent = 'Pay in 4 interest-free payments of $12.50';
            container.appendChild(promoDiv);
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
                const resp = await fetch('/api/paypal/paylater-order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
                });
                const data = await resp.json();
                lastResponse = data;
                emit(UniversalEventType.PAYMENT_METHOD_READY, { orderID: data._raw?.id || data.transactionProcessingDetails?.transactionId });
                const links = data._raw?.links;
                const approveLink = links?.find((l) => l.rel === 'approve');
                const redirectUrl = approveLink?.href || data.checkoutInteractions?.actions?.url;
                if (redirectUrl)
                    emit(UniversalEventType.PAYMENT_AUTHORIZED, { url: redirectUrl, orderID: data._raw?.id, paymentMethod: 'paylater' });
                else
                    emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No approve link in PayPal Pay Later response', retryable: false });
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true });
            }
        },
        async handleRedirectReturn(queryParams) {
            if (!initialized || !eventBus)
                return;
            const orderID = queryParams.token || queryParams.orderID;
            const payerID = queryParams.PayerID;
            if (!orderID) {
                emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing orderID/token', retryable: false });
                return;
            }
            emit(UniversalEventType.PAYMENT_AUTHORIZED, { orderID, payerID, paymentMethod: 'paylater' });
        },
        getServerHandoff() { return { endpoint: '/api/paypal/paylater-order', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD', paymentMethod: 'paylater' } }; },
        mapConfig(chConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency, enableFunding: 'paylater' }; },
        teardown() { eventBus = null; config = null; lastResponse = null; initialized = false; },
    };
}
export const paypalPaylaterAdapter = createPaypalPaylaterAdapter();
//# sourceMappingURL=paypal-paylater-adapter.js.map