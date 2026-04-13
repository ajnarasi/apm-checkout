/**
 * Zepto Adapter — Bank Redirect pattern (PayTo / NPP)
 * API: https://api.sandbox.zeptopayments.com
 * Auth: OAuth 2.0
 * Region: Australia (AUD)
 *
 * Zepto provides account-to-account payments via Australia's NPP (New Payments Platform).
 * Supports PayTo agreements, PayID, direct debit, and real-time NPP payouts.
 * Amount format: integer cents (MULTIPLY_100).
 */

import {
  type APMAdapter, type CheckoutConfig, type EventBus, type PaymentData,
  type RenderOptions, type ServerHandoff,
  UniversalEventType, ErrorCode, CONTRACT_VERSION,
} from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';

export function createZeptoAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let lastResponse: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'zepto', data, timestamp: new Date().toISOString() });
  }

  return {
    id: 'zepto',
    displayName: 'Zepto',
    pattern: 'bank-redirect',
    contractVersion: `^${CONTRACT_VERSION}`,
    supportedEvents: [
      UniversalEventType.PAYMENT_METHOD_READY,
      UniversalEventType.PAYMENT_AUTHORIZED,
      UniversalEventType.PAYMENT_ERROR,
      UniversalEventType.PAYMENT_CANCELLED,
      UniversalEventType.REDIRECT_REQUIRED,
    ],
    sdkMetadata: {
      version: '1.0',
      loadMethod: 'none',
      cspConnectSrc: ['https://api.sandbox.zeptopayments.com', 'https://api.zeptopayments.com'],
    },
    async loadSDK(): Promise<void> {},
    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> {
      config = cfg;
      eventBus = bus;
      initialized = true;
    },
    async render(container: HTMLElement): Promise<void> {
      container.innerHTML = '';
      const btn = document.createElement('button');
      btn.textContent = 'Pay with Zepto';
      btn.style.cssText = 'background:#6C63FF;color:#fff;border:none;border-radius:6px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;width:100%;';
      container.appendChild(btn);
    },
    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) throw new Error('Adapter not initialized. Call init() before authorize()');
      try { validateAmount(paymentData.amount.total); validateCurrency(paymentData.amount.currency ?? 'AUD'); }
      catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.VALIDATION_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); return; }
      try {
        const resp = await fetch('/api/zepto/agreement', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: multiply100(paymentData.amount.total), currency: paymentData.amount.currency ?? 'AUD', merchantOrderId: paymentData.merchantOrderId ?? config?.merchantOrderId, returnUrls: paymentData.returnUrls ?? config?.returnUrls }),
        });
        const data = await resp.json(); lastResponse = data;
        emit(UniversalEventType.PAYMENT_METHOD_READY, { agreementId: data._raw?.uid || data.transactionProcessingDetails?.transactionId });

        const redirectUrl = data._raw?.authorization_url || data.checkoutInteractions?.actions?.url;
        if (redirectUrl) emit(UniversalEventType.REDIRECT_REQUIRED, { url: redirectUrl, agreementId: data._raw?.uid });
        else emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.AUTH_FAILED, message: 'No authorization URL in Zepto response', retryable: false });
      } catch (err) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.NETWORK_ERROR, message: err instanceof Error ? err.message : String(err), retryable: true }); }
    },
    async handleRedirectReturn(queryParams: Record<string, string>): Promise<void> {
      if (!initialized || !eventBus) return;
      const agreementId = queryParams.agreement_uid || queryParams.id;
      const status = queryParams.status;
      if (!agreementId) { emit(UniversalEventType.PAYMENT_ERROR, { code: ErrorCode.REDIRECT_FAILED, message: 'Missing agreement_uid', retryable: false }); return; }
      if (status === 'cancelled') { emit(UniversalEventType.PAYMENT_CANCELLED, { agreementId }); return; }
      emit(UniversalEventType.PAYMENT_AUTHORIZED, { agreementId, status: status || 'active' });
    },
    getServerHandoff(): ServerHandoff { return { endpoint: '/api/zepto/agreement', method: 'POST', body: { amount: multiply100(config?.amount.total ?? 0), currency: config?.amount.currency ?? 'AUD' } }; },
    mapConfig(chConfig: CheckoutConfig) { return { amount: multiply100(chConfig.amount.total), currency: chConfig.amount.currency }; },
    teardown(): void { eventBus = null; config = null; lastResponse = null; initialized = false; },
  };
}
export const zeptoAdapter = createZeptoAdapter();
