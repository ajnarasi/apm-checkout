/**
 * PPRO Adapter Factory — Creates APM adapters for all PPRO-routed payment methods.
 *
 * 39 APMs share the same PPRO payment-charges API but differ in:
 * - paymentMethod code, country, currency
 * - Auth type (REDIRECT vs SCAN_CODE)
 * - UI (button label, brand color, logo)
 * - Special inputs (bank selection, BLIK code, MB Way phone)
 * - Voucher expiry (Boleto 7d, OXXO 72h, etc.)
 * - Dual-mode QR/redirect (Swish, Alipay, PayPay)
 */
import { UniversalEventType, ErrorCode, CONTRACT_VERSION, DEFAULT_TIMEOUTS, } from './types.js';
import { multiply100, validateAmount, validateCurrency } from './transform-utils.js';
function isMobileDevice() {
    if (typeof navigator === 'undefined')
        return false;
    return /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
}
function getSupportedEvents(config) {
    const events = [
        UniversalEventType.PAYMENT_METHOD_READY,
        UniversalEventType.PAYMENT_AUTHORIZED,
        UniversalEventType.PAYMENT_ERROR,
        UniversalEventType.PAYMENT_CANCELLED,
    ];
    if (config.authType === 'REDIRECT' || config.dualMode) {
        events.push(UniversalEventType.REDIRECT_REQUIRED);
    }
    if (config.authType === 'SCAN_CODE' || config.dualMode) {
        events.push(UniversalEventType.QR_CODE_GENERATED);
    }
    if (config.pattern === 'voucher-cash') {
        events.push(UniversalEventType.VOUCHER_CODE_GENERATED);
        events.push(UniversalEventType.VOUCHER_EXPIRED);
    }
    if (config.phoneInput) {
        events.push(UniversalEventType.PHONE_NUMBER_REQUIRED);
    }
    return events;
}
export function createPproAdapter(config) {
    let eventBus = null;
    let checkoutConfig = null;
    let initialized = false;
    let lastChargeResponse = null;
    let pollTimer = null;
    let expiryTimer = null;
    function emitEvent(type, data = {}) {
        eventBus?.emit({
            type,
            apm: config.code.toLowerCase(),
            data,
            timestamp: new Date().toISOString(),
        });
    }
    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (expiryTimer) {
            clearTimeout(expiryTimer);
            expiryTimer = null;
        }
    }
    const adapter = {
        id: config.code.toLowerCase(),
        displayName: config.displayName,
        pattern: config.pattern,
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: getSupportedEvents(config),
        sdkMetadata: {
            version: 'PPRO-v1',
            loadMethod: 'none',
        },
        async loadSDK() {
            // PPRO-routed APMs have no client-side SDK to load
        },
        async init(cfg, bus) {
            // Always accept new config/bus (idempotent for same instance, re-wires for new manager)
            checkoutConfig = cfg;
            eventBus = bus;
            initialized = true;
        },
        async render(container, options) {
            const label = options?.buttonType || config.buttonLabel;
            const btn = document.createElement('button');
            btn.className = 'ch-apm-button';
            btn.setAttribute('data-apm', config.code);
            btn.style.cssText = `
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; padding: 12px 24px; border: none; border-radius: 6px;
        font-size: 16px; font-weight: 600; cursor: pointer;
        background-color: ${config.brandColor}; color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
            if (config.logoUrl) {
                const img = document.createElement('img');
                img.src = config.logoUrl;
                img.alt = config.displayName;
                img.style.cssText = 'height: 24px; width: auto;';
                btn.appendChild(img);
            }
            const span = document.createElement('span');
            span.textContent = label;
            btn.appendChild(span);
            container.innerHTML = '';
            container.appendChild(btn);
            // Bank selection dropdown
            if (config.bankSelection && config.supportedBanks?.length) {
                const select = document.createElement('select');
                select.className = 'ch-bank-select';
                select.setAttribute('data-apm', config.code);
                select.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px; border-radius: 4px; border: 1px solid #ccc;';
                const defaultOpt = document.createElement('option');
                defaultOpt.value = '';
                defaultOpt.textContent = 'Select your bank...';
                select.appendChild(defaultOpt);
                for (const bank of config.supportedBanks) {
                    const opt = document.createElement('option');
                    opt.value = bank;
                    opt.textContent = bank;
                    select.appendChild(opt);
                }
                container.appendChild(select);
            }
            // BLIK code input
            if (config.inputField) {
                const input = document.createElement('input');
                input.type = config.inputField.type === 'numeric' ? 'tel' : 'text';
                input.maxLength = config.inputField.maxLength;
                input.placeholder = config.inputField.placeholder;
                input.className = 'ch-apm-input';
                input.setAttribute('data-apm', config.code);
                input.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px; border-radius: 4px; border: 1px solid #ccc; text-align: center; font-size: 18px; letter-spacing: 4px;';
                container.appendChild(input);
            }
            // Phone input (MB Way)
            if (config.phoneInput) {
                const input = document.createElement('input');
                input.type = 'tel';
                input.placeholder = '+351 9XX XXX XXX';
                input.className = 'ch-phone-input';
                input.setAttribute('data-apm', config.code);
                input.style.cssText = 'width: 100%; padding: 8px; margin-top: 8px; border-radius: 4px; border: 1px solid #ccc;';
                container.appendChild(input);
                emitEvent(UniversalEventType.PHONE_NUMBER_REQUIRED, {});
            }
        },
        async authorize(paymentData) {
            if (!initialized || !eventBus || !checkoutConfig) {
                throw new Error('Adapter not initialized. Call init() before authorize()');
            }
            try {
                validateAmount(paymentData.amount.total);
                validateCurrency(paymentData.amount.currency ?? config.currency);
            }
            catch (err) {
                emitEvent(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: err instanceof Error ? err.message : String(err),
                    retryable: true,
                });
                return;
            }
            // Determine auth type (dual-mode detection)
            let effectiveAuthType = config.authType;
            if (config.dualMode) {
                const forceMode = checkoutConfig.forceMode;
                if (forceMode === 'redirect')
                    effectiveAuthType = 'REDIRECT';
                else if (forceMode === 'qr')
                    effectiveAuthType = 'SCAN_CODE';
                else
                    effectiveAuthType = isMobileDevice() ? 'REDIRECT' : 'SCAN_CODE';
            }
            // Build PPRO charge request
            const chargeBody = {
                amount: multiply100(paymentData.amount.total),
                currency: paymentData.amount.currency ?? config.currency,
                country: config.country,
                paymentMethod: config.code,
                customerName: paymentData.customer
                    ? `${paymentData.customer.firstName ?? ''} ${paymentData.customer.lastName ?? ''}`.trim()
                    : 'Customer',
                customerEmail: paymentData.customer?.email ?? '',
                captureFlag: true,
                returnUrl: paymentData.returnUrls?.successUrl ?? checkoutConfig.returnUrls?.successUrl ?? '',
                merchantOrderId: paymentData.merchantOrderId ?? checkoutConfig.merchantOrderId ?? `CH-${config.code}-${Date.now()}`,
                authType: effectiveAuthType,
            };
            try {
                const resp = await fetch('/api/ppro/charge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chargeBody),
                });
                const data = await resp.json();
                lastChargeResponse = data;
                if (!data.success) {
                    emitEvent(UniversalEventType.PAYMENT_ERROR, {
                        code: ErrorCode.PROVIDER_ERROR,
                        message: data.error || 'PPRO charge failed',
                        retryable: false,
                        chargeId: data.chargeId,
                    });
                    return;
                }
                // Emit PAYMENT_METHOD_READY
                emitEvent(UniversalEventType.PAYMENT_METHOD_READY, {
                    chargeId: data.chargeId,
                    status: data.status,
                    paymentMethod: data.paymentMethod,
                });
                // Voucher pattern
                if (config.pattern === 'voucher-cash') {
                    emitEvent(UniversalEventType.VOUCHER_CODE_GENERATED, {
                        code: data.chargeId,
                        chargeId: data.chargeId,
                        expiresAt: config.voucherExpiry
                            ? new Date(Date.now() + parseExpiry(config.voucherExpiry)).toISOString()
                            : undefined,
                        instructions: `Pay with ${config.displayName}`,
                    });
                    // Start expiry monitoring
                    if (config.voucherExpiry) {
                        const expiryMs = parseExpiry(config.voucherExpiry);
                        expiryTimer = setTimeout(() => {
                            emitEvent(UniversalEventType.VOUCHER_EXPIRED, { chargeId: data.chargeId });
                        }, expiryMs);
                    }
                    return;
                }
                // QR code pattern
                if (effectiveAuthType === 'SCAN_CODE' && (data.hasQR || data._raw?.authenticationMethods)) {
                    const qrUrl = data._raw?.authenticationMethods?.find((m) => m.details?.codeImage)?.details?.codeImage;
                    emitEvent(UniversalEventType.QR_CODE_GENERATED, {
                        qrCodeUrl: qrUrl,
                        chargeId: data.chargeId,
                    });
                    // Start polling for QR scan confirmation
                    startPolling(data.chargeId);
                    return;
                }
                // Redirect pattern
                if (data.hasRedirect || data._raw?.authenticationMethods) {
                    const redirectUrl = data._raw?.authenticationMethods?.find((m) => m.details?.requestUrl)?.details?.requestUrl;
                    if (redirectUrl) {
                        emitEvent(UniversalEventType.REDIRECT_REQUIRED, {
                            url: redirectUrl,
                            chargeId: data.chargeId,
                        });
                    }
                }
            }
            catch (err) {
                emitEvent(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.NETWORK_ERROR,
                    message: err instanceof Error ? err.message : String(err),
                    retryable: true,
                });
            }
        },
        async handleRedirectReturn(queryParams) {
            if (!initialized || !eventBus)
                return;
            const chargeId = queryParams.chargeId || queryParams.id || lastChargeResponse?.chargeId;
            if (!chargeId) {
                emitEvent(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.REDIRECT_FAILED,
                    message: 'No chargeId found in redirect return params',
                    retryable: false,
                });
                return;
            }
            try {
                const resp = await fetch(`/api/ppro/charge/${chargeId}`);
                const data = await resp.json();
                const status = data.status || data._raw?.status;
                if (status === 'CAPTURED' || status === 'AUTHORIZED') {
                    emitEvent(UniversalEventType.PAYMENT_AUTHORIZED, {
                        chargeId,
                        status,
                        amount: data._raw?.authorizations?.[0]?.amount,
                    });
                }
                else if (status === 'AUTHENTICATION_FAILED') {
                    emitEvent(UniversalEventType.PAYMENT_ERROR, {
                        code: ErrorCode.AUTH_FAILED,
                        message: `Payment ${status}`,
                        retryable: false,
                    });
                }
                else {
                    emitEvent(UniversalEventType.PAYMENT_CANCELLED, {
                        chargeId,
                        status,
                    });
                }
            }
            catch (err) {
                emitEvent(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.NETWORK_ERROR,
                    message: err instanceof Error ? err.message : String(err),
                    retryable: true,
                });
            }
        },
        getServerHandoff() {
            return {
                endpoint: '/api/ppro/charge',
                method: 'POST',
                body: {
                    paymentMethod: config.code,
                    country: config.country,
                    currency: config.currency,
                    amount: checkoutConfig?.amount.total ?? 0,
                    chargeId: lastChargeResponse?.chargeId,
                },
            };
        },
        mapConfig(chConfig) {
            return {
                paymentMethod: config.code,
                country: config.country,
                currency: config.currency,
                amount: multiply100(chConfig.amount.total),
                authType: config.authType,
                brandColor: config.brandColor,
                buttonLabel: config.buttonLabel,
            };
        },
        teardown() {
            stopPolling();
            eventBus = null;
            checkoutConfig = null;
            lastChargeResponse = null;
            initialized = false;
        },
    };
    function startPolling(chargeId) {
        const interval = config.pollInterval
            ?? DEFAULT_TIMEOUTS.pollInterval[config.pattern]
            ?? 3000;
        const maxDuration = config.pollMaxDuration
            ?? DEFAULT_TIMEOUTS.pollMaxDuration[config.pattern]
            ?? 3600000;
        const startTime = Date.now();
        let attempts = 0;
        pollTimer = setInterval(async () => {
            attempts++;
            if (Date.now() - startTime > maxDuration) {
                stopPolling();
                emitEvent(UniversalEventType.PAYMENT_ERROR, {
                    code: ErrorCode.AUTH_TIMEOUT,
                    message: `Polling timed out after ${Math.round(maxDuration / 1000)}s`,
                    retryable: false,
                });
                return;
            }
            try {
                const resp = await fetch(`/api/ppro/charge/${chargeId}`);
                const data = await resp.json();
                const status = data.status || data._raw?.status;
                if (status === 'CAPTURED' || status === 'AUTHORIZED') {
                    stopPolling();
                    emitEvent(UniversalEventType.PAYMENT_AUTHORIZED, {
                        chargeId,
                        status,
                    });
                }
                else if (status === 'AUTHENTICATION_FAILED' || status === 'VOIDED') {
                    stopPolling();
                    emitEvent(UniversalEventType.PAYMENT_CANCELLED, {
                        chargeId,
                        status,
                    });
                }
                // else keep polling (AUTHENTICATION_PENDING)
            }
            catch {
                // Network error during poll — continue polling
            }
        }, interval);
    }
    return adapter;
}
function parseExpiry(expiry) {
    const match = expiry.match(/^(\d+)(h|d)$/);
    if (!match)
        return 72 * 3600 * 1000; // default 72 hours
    const value = parseInt(match[1], 10);
    const unit = match[2];
    return unit === 'h' ? value * 3600 * 1000 : value * 24 * 3600 * 1000;
}
//# sourceMappingURL=ppro-adapter-factory.js.map