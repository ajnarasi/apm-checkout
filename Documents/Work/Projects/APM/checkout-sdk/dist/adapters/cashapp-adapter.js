/**
 * Cash App Pay Adapter — Redirect wallet pattern
 * SDK: https://sand.kit.cash.app/web/cashapp-pay.js (sandbox)
 * Sandbox: sandbox.api.cash.app
 *
 * Magic amounts (cents): 7771=insufficient, 7772=decline, 7774=too large, 7775=too small
 * Magic grants: GRG_sandbox:active (success), GRG_sandbox:consumed/expired/revoked
 */
import { UniversalEventType, ErrorCode, CONTRACT_VERSION, DEFAULT_TIMEOUTS, } from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createCashAppAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    let requestId = null;
    let pollTimer = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'cashapp', data, timestamp: new Date().toISOString() });
    }
    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }
    return {
        id: 'cashapp',
        displayName: 'Cash App Pay',
        pattern: 'redirect-wallet',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.REDIRECT_REQUIRED,
            UniversalEventType.QR_CODE_GENERATED,
        ],
        sdkMetadata: {
            cdnUrl: 'https://sand.kit.cash.app/web/cashapp-pay.js',
            version: 'v1',
            loadMethod: 'async-script',
            globalVariable: 'window.CashAppPay',
            cspScriptSrc: ['https://sand.kit.cash.app'],
            cspConnectSrc: ['https://sandbox.api.cash.app'],
        },
        async loadSDK() {
            // CashApp Pay Kit SDK can be loaded, but our adapter primarily uses server-side
            // customer request creation. The SDK is optional for button rendering.
        },
        async init(cfg, bus) {
            config = cfg;
            eventBus = bus;
            initialized = true;
        },
        async render(container, options) {
            const btn = document.createElement('button');
            btn.className = 'ch-cashapp-button';
            btn.style.cssText = `
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 12px 24px; border: none; border-radius: 6px;
        font-size: 16px; font-weight: 600; cursor: pointer;
        background-color: #00D632; color: #000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
            btn.innerHTML = '<span>Pay with Cash App</span>';
            container.innerHTML = '';
            container.appendChild(btn);
        },
        async authorize(paymentData) {
            if (!initialized || !eventBus) {
                throw new Error('Adapter not initialized. Call init() before authorize()');
            }
            try {
                validateAmount(paymentData.amount.total);
                validateCurrency(paymentData.amount.currency ?? 'USD');
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: err instanceof Error ? err.message : String(err),
                    retryable: true,
                });
                return;
            }
            try {
                const resp = await fetch('/api/cashapp/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: paymentData.amount.total,
                        currency: paymentData.amount.currency ?? 'USD',
                        merchantReference: paymentData.merchantOrderId ?? config?.merchantOrderId ?? `ch-${Date.now()}`,
                        redirectUrl: paymentData.returnUrls?.successUrl ?? config?.returnUrls?.successUrl,
                    }),
                });
                const data = await resp.json();
                lastResponse = data;
                requestId = data.order?.providerOrderId;
                if (!requestId) {
                    emit(UniversalEventType.PAYMENT_ERROR, {
                        code: ErrorCode.PROVIDER_ERROR,
                        message: 'CashApp customer request creation failed',
                        retryable: false,
                    });
                    return;
                }
                emit(UniversalEventType.PAYMENT_METHOD_READY, {
                    providerOrderId: requestId,
                    status: data.order?.orderStatus,
                });
                // Emit QR code if available
                const qrUrl = data.checkoutInteractions?.actions?.code;
                if (qrUrl) {
                    emit(UniversalEventType.QR_CODE_GENERATED, { qrCodeUrl: qrUrl });
                }
                // Emit redirect URL
                const redirectUrl = data.checkoutInteractions?.actions?.url;
                if (redirectUrl) {
                    emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl });
                }
                // Start polling for customer approval
                startPolling();
            }
            catch (err) {
                emit(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.NETWORK_ERROR,
                    message: err instanceof Error ? err.message : String(err),
                    retryable: true,
                });
            }
        },
        async handleRedirectReturn(queryParams) {
            // CashApp uses polling, not redirect return. But if customer returns, check status.
            if (requestId) {
                try {
                    const resp = await fetch(`/api/cashapp/request/${requestId}`);
                    const data = await resp.json();
                    const status = data.request?.status;
                    if (status === 'APPROVED') {
                        const grantId = data.request?.grants?.[0]?.id;
                        emit(UniversalEventType.PAYMENT_AUTHORIZED, { grantId, requestId });
                    }
                }
                catch { /* continue polling */ }
            }
        },
        getServerHandoff() {
            return {
                endpoint: '/api/cashapp/request',
                method: 'POST',
                body: {
                    amount: config?.amount.total ?? 0,
                    currency: config?.amount.currency ?? 'USD',
                    requestId,
                },
            };
        },
        mapConfig(chConfig) {
            return {
                amount: multiply100(chConfig.amount.total),
                currency: chConfig.amount.currency,
                channel: 'ONLINE',
            };
        },
        teardown() {
            stopPolling();
            eventBus = null;
            config = null;
            lastResponse = null;
            requestId = null;
            initialized = false;
        },
    };
    function startPolling() {
        const interval = config?.authTimeout
            ? Math.min(2000, config.authTimeout / 100)
            : DEFAULT_TIMEOUTS.pollInterval['redirect-wallet'];
        const maxDuration = DEFAULT_TIMEOUTS.pollMaxDuration['redirect-wallet'];
        const startTime = Date.now();
        pollTimer = setInterval(async () => {
            if (Date.now() - startTime > maxDuration) {
                stopPolling();
                emit(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.AUTH_TIMEOUT,
                    message: `CashApp polling timed out after ${Math.round(maxDuration / 1000)}s`,
                    retryable: false,
                });
                return;
            }
            if (!requestId)
                return;
            try {
                const resp = await fetch(`/api/cashapp/request/${requestId}`);
                const data = await resp.json();
                const status = data.request?.status;
                if (status === 'APPROVED') {
                    stopPolling();
                    const grantId = data.request?.grants?.[0]?.id;
                    emit(UniversalEventType.PAYMENT_AUTHORIZED, {
                        grantId,
                        requestId,
                        customerId: data.request?.grants?.[0]?.customer_id,
                    });
                }
                else if (status === 'DECLINED' || status === 'EXPIRED') {
                    stopPolling();
                    emit(UniversalEventType.PAYMENT_CANCELLED, { status, requestId });
                }
            }
            catch { /* network error during poll — continue */ }
        }, interval);
    }
}
export const cashappAdapter = createCashAppAdapter();
//# sourceMappingURL=cashapp-adapter.js.map