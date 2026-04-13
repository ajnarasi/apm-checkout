/**
 * Klarna Payments Adapter — Server BNPL pattern
 * SDK: https://x.klarnacdn.net/kp/lib/v1/api.js
 * Global: window.Klarna.Payments
 * Sandbox: api-na.playground.klarna.com
 *
 * Test data: email=customer+us@klarna.com (approved), customer+us+denied@klarna.com (declined)
 */
import { UniversalEventType, ErrorCode, CONTRACT_VERSION, DEFAULT_TIMEOUTS, } from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createKlarnaAdapter() {
    let eventBus = null;
    let config = null;
    let initialized = false;
    let authorizationToken = null;
    let sessionData = null;
    function emit(type, data = {}) {
        eventBus?.emit({ type, apm: 'klarna', data, timestamp: new Date().toISOString() });
    }
    function loadScript(timeout) {
        if (window.Klarna?.Payments)
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://x.klarnacdn.net/kp/lib/v1/api.js';
            script.async = true;
            const timer = setTimeout(() => {
                reject(new Error('Klarna SDK load timeout'));
            }, timeout);
            script.onload = () => { clearTimeout(timer); resolve(); };
            script.onerror = () => { clearTimeout(timer); reject(new Error('Failed to load Klarna SDK')); };
            document.head.appendChild(script);
        });
    }
    return {
        id: 'klarna',
        displayName: 'Klarna',
        pattern: 'server-bnpl',
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            UniversalEventType.WIDGET_HEIGHT_CHANGED,
            UniversalEventType.WIDGET_OVERLAY_SHOWN,
            UniversalEventType.WIDGET_OVERLAY_HIDDEN,
        ],
        sdkMetadata: {
            cdnUrl: 'https://x.klarnacdn.net/kp/lib/v1/api.js',
            version: 'v1',
            loadMethod: 'async-script',
            globalVariable: 'window.Klarna.Payments',
            cspScriptSrc: ['https://x.klarnacdn.net'],
            cspConnectSrc: ['https://api-na.playground.klarna.com', 'https://api-eu.playground.klarna.com'],
        },
        async loadSDK(cfg) {
            const timeout = cfg.scriptTimeout ?? DEFAULT_TIMEOUTS.scriptLoad;
            const retries = DEFAULT_TIMEOUTS.retryBackoff;
            let lastError = null;
            for (let i = 0; i <= retries.length; i++) {
                try {
                    await loadScript(timeout);
                    return;
                }
                catch (err) {
                    lastError = err instanceof Error ? err : new Error(String(err));
                    if (i < retries.length) {
                        await new Promise(r => setTimeout(r, retries[i]));
                    }
                }
            }
            throw lastError ?? new Error('Failed to load Klarna SDK');
        },
        async init(cfg, bus) {
            config = cfg;
            eventBus = bus;
            const clientToken = cfg.credentials?.clientToken;
            if (!clientToken) {
                throw new Error('Klarna adapter requires credentials.clientToken (from server session)');
            }
            // Create session via server to get client_token
            if (!sessionData) {
                try {
                    const resp = await fetch('/api/klarna/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: cfg.amount.total,
                            currency: cfg.amount.currency,
                            taxAmount: 0,
                            merchantReference: cfg.merchantOrderId ?? `ch-${Date.now()}`,
                            items: cfg.items?.map(i => ({
                                itemName: i.itemName, quantity: i.quantity,
                                unitPrice: i.unitPrice, grossAmount: i.grossAmount, taxAmount: i.taxAmount ?? 0,
                            })) ?? [],
                            shippingAddress: cfg.shippingAddress,
                            billingAddress: cfg.billingAddress,
                        }),
                    });
                    sessionData = await resp.json();
                }
                catch {
                    // If server not available, use provided client token directly
                }
            }
            const raw = sessionData;
            const pm = raw?.paymentMethod?.paymentToken;
            const token = pm?.tokenData ?? clientToken;
            if (window.Klarna?.Payments) {
                window.Klarna.Payments.init({ client_token: token });
                // Wire Klarna events to universal events
                window.Klarna.Payments.on('heightChanged', (height) => {
                    emit(UniversalEventType.WIDGET_HEIGHT_CHANGED, { height });
                });
                window.Klarna.Payments.on('fullscreenOverlayShown', () => {
                    emit(UniversalEventType.WIDGET_OVERLAY_SHOWN, {});
                });
                window.Klarna.Payments.on('fullscreenOverlayHidden', () => {
                    emit(UniversalEventType.WIDGET_OVERLAY_HIDDEN, {});
                });
            }
            initialized = true;
        },
        async render(container, options) {
            if (!window.Klarna?.Payments) {
                emit(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.RENDER_FAILED, message: 'Klarna SDK not loaded', retryable: true,
                });
                return;
            }
            return new Promise((resolve) => {
                window.Klarna.Payments.load({ container, payment_method_category: options?.buttonType ?? 'klarna' }, null, (res) => {
                    if (res.show_form) {
                        emit(UniversalEventType.PAYMENT_METHOD_READY, {
                            showForm: true,
                            sessionId: sessionData?.order?.providerOrderId,
                        });
                    }
                    else {
                        emit(UniversalEventType.PAYMENT_ERROR, {
                            code: ErrorCode.RENDER_FAILED,
                            message: 'Klarna widget not available for this session',
                            retryable: false,
                            invalidFields: res.error?.invalid_fields,
                        });
                    }
                    resolve();
                });
            });
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
            if (!window.Klarna?.Payments) {
                emit(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.INIT_FAILED, message: 'Klarna SDK not available', retryable: false,
                });
                return;
            }
            window.Klarna.Payments.authorize({ payment_method_category: 'klarna' }, null, (res) => {
                if (res.approved && res.authorization_token) {
                    authorizationToken = res.authorization_token;
                    emit(UniversalEventType.PAYMENT_AUTHORIZED, {
                        authorizationToken: res.authorization_token,
                        finalizeRequired: res.finalize_required,
                    });
                }
                else if (res.show_form) {
                    // Customer needs to complete the form — don't emit terminal event
                }
                else {
                    emit(UniversalEventType.PAYMENT_CANCELLED, {
                        approved: false,
                        error: res.error,
                    });
                }
            });
        },
        async handleRedirectReturn() {
            // Klarna is widget-based, not redirect. No-op.
        },
        getServerHandoff() {
            return {
                endpoint: '/api/klarna/order',
                method: 'POST',
                body: {
                    authorizationToken,
                    orderAmount: multiply100(config?.amount.total ?? 0),
                    orderTaxAmount: 0,
                    orderLines: config?.items?.map(i => ({
                        name: i.itemName,
                        quantity: i.quantity,
                        unit_price: multiply100(i.unitPrice),
                        total_amount: multiply100(i.grossAmount),
                        total_tax_amount: multiply100(i.taxAmount ?? 0),
                    })) ?? [],
                },
            };
        },
        mapConfig(chConfig) {
            return {
                order_amount: multiply100(chConfig.amount.total),
                purchase_currency: chConfig.amount.currency,
                locale: chConfig.locale ?? 'en-US',
                purchase_country: chConfig.shippingAddress?.country ?? 'US',
            };
        },
        teardown() {
            if (window.Klarna?.Payments) {
                window.Klarna.Payments.off('heightChanged');
                window.Klarna.Payments.off('fullscreenOverlayShown');
                window.Klarna.Payments.off('fullscreenOverlayHidden');
            }
            eventBus = null;
            config = null;
            sessionData = null;
            authorizationToken = null;
            initialized = false;
        },
    };
}
export const klarnaAdapter = createKlarnaAdapter();
//# sourceMappingURL=klarna-adapter.js.map