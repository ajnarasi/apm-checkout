import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { decimalToStringCents, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createAlipayplusAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'alipayplus', data, timestamp: new Date().toISOString() });
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function startPolling(transactionId: string) {
    stopPolling();
    const startTime = Date.now();
    const maxDuration = 3_600_000; // 60 minutes
    const interval = 3_000; // 3 seconds

    pollTimer = setInterval(async () => {
      if (Date.now() - startTime > maxDuration) {
        stopPolling();
        emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.QR_EXPIRED, message: 'QR code polling timed out', retryable: true });
        return;
      }
      try {
        const resp = await fetch(`/api/alipayplus/inquiry/${transactionId}`);
        const data = await resp.json();
        if (data.status === 'SUCCESS' || data._raw?.result?.resultStatus === 'S') {
          stopPolling();
          lastResponse = data;
          emit(UniversalEventType.PAYMENT_AUTHORIZED, { transactionId, orderId: data.transactionProcessingDetails?.transactionId });
        }
      } catch (_) { /* polling continues on error */ }
    }, interval);
  }

  return {
    id: 'alipayplus',
    displayName: 'Alipay+',
    pattern: 'qr-code',
    contractVersion: `^${CONTRACT_VERSION}`,
    supportedEvents: [
      UniversalEventType.PAYMENT_METHOD_READY,
      UniversalEventType.PAYMENT_AUTHORIZED,
      UniversalEventType.PAYMENT_ERROR,
      UniversalEventType.PAYMENT_CANCELLED,
      UniversalEventType.QR_CODE_GENERATED,
      UniversalEventType.REDIRECT_REQUIRED,
    ],
    sdkMetadata: { version: '1.0', loadMethod: 'none' },
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('button');
      btn.textContent = 'Pay with Alipay+';
      btn.style.cssText = 'background:#1677FF;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/alipayplus/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: decimalToStringCents(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { transactionId: data.transactionProcessingDetails?.transactionId });

        const qrCode = data.checkoutInteractions?.actions?.code || data._raw?.normalUrl;
        if (qrCode) {
          emit(UniversalEventType.QR_CODE_GENERATED, { code: qrCode, transactionId: data.transactionProcessingDetails?.transactionId });
          const txnId = data.transactionProcessingDetails?.transactionId || data._raw?.paymentId;
          if (txnId) startPolling(txnId);
        }

        const redirectUrl = data.checkoutInteractions?.actions?.url || data._raw?.redirectUrl;
        if (redirectUrl) emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl });
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const transactionId = queryParams.transactionId || queryParams.paymentId;
      if (!transactionId) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing transactionId', retryable: false }); return; }
      emit(UniversalEventType.PAYMENT_AUTHORIZED, { transactionId });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/alipayplus/pay', method: 'POST', body: { amount: decimalToStringCents(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: decimalToStringCents(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { stopPolling(); eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const alipayplusAdapter = createAlipayplusAdapter();
