import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createApplepayAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
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
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('apple-pay-button');
      btn.setAttribute('buttonstyle', 'black');
      btn.setAttribute('type', 'buy');
      btn.setAttribute('locale', config?.locale ?? 'en-US');
      btn.style.cssText = 'display:block;width:100%;height:48px;cursor:pointer;--apple-pay-button-width:100%;--apple-pay-button-height:48px;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        // In production, this would create an ApplePaySession. Mocked for SDK layer.
        const resp = await fetch('/api/applepay/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_AUTHORIZED, { paymentToken: data._raw?.paymentToken, transactionId: data.transactionProcessingDetails?.transactionId });
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(_queryParams: Record<string, string>): Promise<void> {
      // Apple Pay uses native sheet, no redirect return needed
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/applepay/session', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const applepayAdapter = createApplepayAdapter();
