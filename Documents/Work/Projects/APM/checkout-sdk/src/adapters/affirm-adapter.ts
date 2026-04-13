import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createAffirmAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'affirm', data, timestamp: new Date().toISOString() });
  }

  return {
    id: 'affirm',
    displayName: 'Affirm',
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
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('button');
      btn.textContent = 'Pay with Affirm';
      btn.style.cssText = 'background:#4A4AF4;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/affirm/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { checkoutToken: data._raw?.checkout_token || data.transactionProcessingDetails?.transactionId });

        // Simulate Affirm modal overlay flow
        emit(UniversalEventType.WIDGET_OVERLAY_SHOWN, { checkoutToken: data._raw?.checkout_token });
        // In production, Affirm SDK handles the modal. Here we simulate authorization.
        emit(UniversalEventType.PAYMENT_AUTHORIZED, { checkoutToken: data._raw?.checkout_token, transactionId: data.transactionProcessingDetails?.transactionId });
        emit(UniversalEventType.WIDGET_OVERLAY_HIDDEN, {});
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const checkoutToken = queryParams.checkout_token;
      if (checkoutToken) emit(UniversalEventType.PAYMENT_AUTHORIZED, { checkoutToken });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/affirm/checkout', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const affirmAdapter = createAffirmAdapter();
