/**
 * Klarna Payments Adapter — Server BNPL pattern
 * SDK: https://x.klarnacdn.net/kp/lib/v1/api.js
 * Global: window.Klarna.Payments
 * Sandbox: api-na.playground.klarna.com
 *
 * Test data: email=customer+us@klarna.com (approved), customer+us+denied@klarna.com (declined)
 */

import {
  type APMAdapter,
  type CheckoutConfig,
  type EventBus,
  type PaymentData,
  type RenderOptions,
  type ServerHandoff,
  UniversalEventType,
  ErrorCode,
  CONTRACT_VERSION,
  DEFAULT_TIMEOUTS,
} from '../core/types.js';
import { multiply100, validateAmount, validateCurrency } from '../core/transform-utils.js';

declare global {
  interface Window {
    Klarna?: {
      Payments: {
        init(config: { client_token: string }): void;
        load(
          options: { container: string | HTMLElement; payment_method_category?: string },
          data: Record<string, unknown> | null,
          callback: (res: { show_form: boolean; error?: { invalid_fields: string[] } }) => void
        ): void;
        authorize(
          options: { payment_method_category?: string; auto_finalize?: boolean },
          data: Record<string, unknown> | null,
          callback: (res: {
            approved: boolean;
            authorization_token?: string;
            show_form?: boolean;
            finalize_required?: boolean;
            error?: { invalid_fields: string[] };
          }) => void
        ): void;
        on(event: string, handler: (...args: unknown[]) => void): void;
        off(event: string, handler?: (...args: unknown[]) => void): void;
      };
    };
  }
}

export function createKlarnaAdapter(): APMAdapter {
  let eventBus: EventBus | null = null;
  let config: CheckoutConfig | null = null;
  let initialized = false;
  let authorizationToken: string | null = null;
  let sessionData: Record<string, unknown> | null = null;

  function emit(type: UniversalEventType, data: Record<string, unknown> = {}) {
    eventBus?.emit({ type, apm: 'klarna', data, timestamp: new Date().toISOString() });
  }

  function loadScript(timeout: number): Promise<void> {
    if (window.Klarna?.Payments) return Promise.resolve();
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

    async loadSDK(cfg: CheckoutConfig): Promise<void> {
      const timeout = cfg.scriptTimeout ?? DEFAULT_TIMEOUTS.scriptLoad;
      const retries = DEFAULT_TIMEOUTS.retryBackoff;
      let lastError: Error | null = null;
      for (let i = 0; i <= retries.length; i++) {
        try {
          await loadScript(timeout);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (i < retries.length) {
            await new Promise(r => setTimeout(r, retries[i]));
          }
        }
      }
      throw lastError ?? new Error('Failed to load Klarna SDK');
    },

    async init(cfg: CheckoutConfig, bus: EventBus): Promise<void> {
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
        } catch {
          // If server not available, use provided client token directly
        }
      }
      const raw = sessionData as Record<string, unknown> | null;
      const pm = (raw?.paymentMethod as Record<string, unknown>)?.paymentToken as Record<string, unknown> | undefined;
      const token = (pm?.tokenData as string) ?? clientToken;
      if (window.Klarna?.Payments) {
        window.Klarna.Payments.init({ client_token: token as string });
        // Wire Klarna events to universal events
        window.Klarna.Payments.on('heightChanged', (height: unknown) => {
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

    async render(container: HTMLElement, options?: RenderOptions): Promise<void> {
      if (!window.Klarna?.Payments) {
        emit(UniversalEventType.PAYMENT_ERROR, {
          code: ErrorCode.RENDER_FAILED, message: 'Klarna SDK not loaded', retryable: true,
        });
        return;
      }
      return new Promise<void>((resolve) => {
        window.Klarna!.Payments.load(
          { container, payment_method_category: options?.buttonType ?? 'klarna' },
          null,
          (res) => {
            if (res.show_form) {
              emit(UniversalEventType.PAYMENT_METHOD_READY, {
                showForm: true,
                sessionId: (sessionData as Record<string, Record<string, string>>)?.order?.providerOrderId,
              });
            } else {
              emit(UniversalEventType.PAYMENT_ERROR, {
                code: ErrorCode.RENDER_FAILED,
                message: 'Klarna widget not available for this session',
                retryable: false,
                invalidFields: res.error?.invalid_fields,
              });
            }
            resolve();
          }
        );
      });
    },

    async authorize(paymentData: PaymentData): Promise<void> {
      if (!initialized || !eventBus) {
        throw new Error('Adapter not initialized. Call init() before authorize()');
      }
      try {
        validateAmount(paymentData.amount.total);
        validateCurrency(paymentData.amount.currency ?? 'USD');
      } catch (err) {
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
      window.Klarna.Payments.authorize(
        { payment_method_category: 'klarna' },
        null,
        (res) => {
          if (res.approved && res.authorization_token) {
            authorizationToken = res.authorization_token;
            emit(UniversalEventType.PAYMENT_AUTHORIZED, {
              authorizationToken: res.authorization_token,
              finalizeRequired: res.finalize_required,
            });
          } else if (res.show_form) {
            // Customer needs to complete the form — don't emit terminal event
          } else {
            emit(UniversalEventType.PAYMENT_CANCELLED, {
              approved: false,
              error: res.error,
            });
          }
        }
      );
    },

    async handleRedirectReturn(): Promise<void> {
      // Klarna is widget-based, not redirect. No-op.
    },

    getServerHandoff(): ServerHandoff {
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

    mapConfig(chConfig: CheckoutConfig): Record<string, unknown> {
      return {
        order_amount: multiply100(chConfig.amount.total),
        purchase_currency: chConfig.amount.currency,
        locale: chConfig.locale ?? 'en-US',
        purchase_country: chConfig.shippingAddress?.country ?? 'US',
      };
    },

    teardown(): void {
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
