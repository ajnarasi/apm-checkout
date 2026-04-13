import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createTabapayAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'tabapay', data, timestamp: new Date().toISOString() });
  }

  return {
    id: 'tabapay',
    displayName: 'TabaPay',
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
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('button');
      btn.textContent = 'Pay with TabaPay';
      btn.style.cssText = 'background:#1B2845;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/tabapay/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { sessionId: data._raw?.sessionId || data.transactionProcessingDetails?.transactionId });

        const redirectUrl = data.checkoutInteractions?.actions?.url || data._raw?.redirectUrl;
        if (redirectUrl) emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl, sessionId: data._raw?.sessionId });
        else emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No redirect URL', retryable: false });
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const sessionId = queryParams.sessionId || queryParams.transactionId;
      if (!sessionId) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing sessionId', retryable: false }); return; }
      emit(UniversalEventType.PAYMENT_AUTHORIZED, { sessionId });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/tabapay/session', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const tabapayAdapter = createTabapayAdapter();
