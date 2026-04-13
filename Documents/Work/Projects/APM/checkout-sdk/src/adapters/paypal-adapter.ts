import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { numberToString, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createPaypalAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'paypal', data, timestamp: new Date().toISOString() });
  }

  return {
    id: 'paypal',
    displayName: 'PayPal',
    pattern: 'redirect-wallet',
    contractVersion: `^${CONTRACT_VERSION}`,
    supportedEvents: [
      UniversalEventType.PAYMENT_METHOD_READY,
      UniversalEventType.PAYMENT_AUTHORIZED,
      UniversalEventType.PAYMENT_ERROR,
      UniversalEventType.PAYMENT_CANCELLED,
      UniversalEventType.REDIRECT_REQUIRED,
      UniversalEventType.SHIPPING_ADDRESS_CHANGED,
      UniversalEventType.SHIPPING_METHOD_CHANGED,
    ],
    sdkMetadata: { version: '1.0', loadMethod: 'none' },
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('button');
      btn.textContent = 'Pay with PayPal';
      btn.style.cssText = 'background:#FFC439;color:#111;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/paypal/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numberToString(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { orderID: data._raw?.id || data.transactionProcessingDetails?.transactionId });

        const links = data._raw?.links as Array<{ rel: string; href: string }> | undefined;
        const approveLink = links?.find((l: { rel: string; href: string }) => l.rel === 'approve');
        const redirectUrl = approveLink?.href || data.checkoutInteractions?.actions?.url;
        if (redirectUrl) emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl, orderID: data._raw?.id });
        else emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No approve link in PayPal response', retryable: false });
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const orderID = queryParams.token || queryParams.orderID;
      const payerID = queryParams.PayerID;
      if (!orderID) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing orderID/token', retryable: false }); return; }
      emit(UniversalEventType.PAYMENT_AUTHORIZED, { orderID, payerID });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/paypal/order', method: 'POST', body: { amount: numberToString(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: numberToString(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const paypalAdapter = createPaypalAdapter();
