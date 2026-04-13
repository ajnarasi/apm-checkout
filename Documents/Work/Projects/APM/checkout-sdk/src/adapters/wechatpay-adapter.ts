import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createWechatpayAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'wechatpay', data, timestamp: new Date().toISOString() });
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
        const resp = await fetch(`/api/wechatpay/query/${transactionId}`);
        const data = await resp.json();
        if (data.trade_state === 'SUCCESS' || data._raw?.trade_state === 'SUCCESS') {
          stopPolling();
          lastResponse = data;
          emit(UniversalEventType.PAYMENT_AUTHORIZED, { transactionId, orderId: data.transactionProcessingDetails?.transactionId });
        }
      } catch (_) { /* polling continues on error */ }
    }, interval);
  }

  return {
    id: 'wechatpay',
    displayName: 'WeChat Pay',
    pattern: 'qr-code',
    contractVersion: `^${CONTRACT_VERSION}`,
    supportedEvents: [
      UniversalEventType.PAYMENT_METHOD_READY,
      UniversalEventType.PAYMENT_AUTHORIZED,
      UniversalEventType.PAYMENT_ERROR,
      UniversalEventType.PAYMENT_CANCELLED,
      UniversalEventType.QR_CODE_GENERATED,
    ],
    sdkMetadata: { version: '1.0', loadMethod: 'none' },
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> { config = cfg; eventBus = bus; initialized = true; },
    async render(container: HTMLElement): Promise<void> {
      const btn = document.createElement('button');
      btn.textContent = 'Pay with WeChat Pay';
      btn.style.cssText = 'background:#07C160;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.innerHTML = ''; container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'USD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/wechatpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: multiply100(paymentData.amount.total), currency: paymentData.amount.currency ?? 'USD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { transactionId: data.transactionProcessingDetails?.transactionId });

        const qrCode = data._raw?.code_url || data.checkoutInteractions?.actions?.code;
        if (qrCode) {
          emit(UniversalEventType.QR_CODE_GENERATED, { code: qrCode, transactionId: data.transactionProcessingDetails?.transactionId });
          const txnId = data.transactionProcessingDetails?.transactionId || data._raw?.out_trade_no;
          if (txnId) startPolling(txnId);
        } else {
          emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No QR code URL returned', retryable: false });
        }
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const transactionId = queryParams.transactionId || queryParams.out_trade_no;
      if (transactionId) emit(UniversalEventType.PAYMENT_AUTHORIZED, { transactionId });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/wechatpay/order', method: 'POST', body: { amount: multiply100(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'USD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: multiply100(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { stopPolling(); eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const wechatpayAdapter = createWechatpayAdapter();
