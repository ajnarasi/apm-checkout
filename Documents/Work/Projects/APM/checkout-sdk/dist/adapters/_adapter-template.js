/**
 * APM Adapter Template
 *
 * Copy this file and fill in the APM-specific details to create a new adapter.
 * This template shows the standard closure-based pattern used by all adapters.
 *
 * For PPRO-routed APMs, use createPproAdapter() instead — see ideal-adapter.ts for example.
 * For direct-integration APMs (with their own JS SDK), use this template.
 */
import { UniversalEventType, ErrorCode, CONTRACT_VERSION, } from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';
export function createTemplateAdapter() {
    // --- Closure state (reset on teardown) ---
    let eventBus = null;
    let config = null;
    let initialized = false;
    let lastResponse = null;
    function emit(type, data = {}) {
        eventBus?.emit({
            type,
            apm: 'template', // Replace with your APM id
            data,
            timestamp: new Date().toISOString(),
        });
    }
    return {
        // --- Identity ---
        id: 'template',
        displayName: 'Template APM',
        pattern: 'redirect-wallet', // Change to your pattern
        contractVersion: `^${CONTRACT_VERSION}`,
        supportedEvents: [
            UniversalEventType.PAYMENT_METHOD_READY,
            UniversalEventType.PAYMENT_AUTHORIZED,
            UniversalEventType.PAYMENT_ERROR,
            UniversalEventType.PAYMENT_CANCELLED,
            // Add pattern-specific events:
            // UniversalEventType.REDIRECT_REQUIRED,
            // UniversalEventType.QR_CODE_GENERATED,
            // UniversalEventType.VOUCHER_CODE_GENERATED,
        ],
        // --- SDK Metadata ---
        sdkMetadata: {
            cdnUrl: 'https://cdn.example.com/sdk.js', // External SDK URL
            version: '1.0.0',
            loadMethod: 'async-script',
            globalVariable: 'window.ExampleSDK',
        },
        // --- Lifecycle ---
        async loadSDK(cfg) {
            // Load external SDK script. Skip if no cdnUrl (server-side only APMs).
            // Example:
            // return new Promise((resolve, reject) => {
            //   const script = document.createElement('script');
            //   script.src = 'https://cdn.example.com/sdk.js';
            //   script.async = true;
            //   script.onload = () => resolve();
            //   script.onerror = () => reject(new Error('Failed to load SDK'));
            //   document.head.appendChild(script);
            // });
        },
        async init(cfg, bus) {
            config = cfg;
            eventBus = bus;
            initialized = true;
            // Initialize the SDK with credentials from config.credentials
        },
        async render(container, options) {
            // Render payment button or widget into the container
            container.innerHTML = '<button>Pay with Template APM</button>';
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
            // Call your server endpoint, then emit events based on the response:
            // emit(UniversalEventType.PAYMENT_METHOD_READY, { ... });
            // emit(UniversalEventType.REDIRECT_REQUIRED, { url: '...' });
            // or for widgets: the SDK callback will trigger emit(PAYMENT_AUTHORIZED, { ... });
        },
        async handleRedirectReturn(queryParams) {
            // For redirect-pattern APMs: parse return URL params and check status
            // For non-redirect APMs: no-op
        },
        getServerHandoff() {
            return {
                endpoint: '/api/template/process', // Your server endpoint
                method: 'POST',
                body: {
                    amount: config?.amount.total ?? 0,
                    currency: config?.amount.currency ?? 'USD',
                    // Add APM-specific fields
                },
            };
        },
        mapConfig(chConfig) {
            return {
                amount: multiply100(chConfig.amount.total),
                currency: chConfig.amount.currency,
            };
        },
        teardown() {
            eventBus = null;
            config = null;
            lastResponse = null;
            initialized = false;
        },
    };
}
//# sourceMappingURL=_adapter-template.js.map