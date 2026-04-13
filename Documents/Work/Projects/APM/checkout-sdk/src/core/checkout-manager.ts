/**
 * Checkout Manager — Orchestrator for the payment lifecycle.
 *
 * Manages: init → render → authorize → handleRedirectReturn → getServerHandoff
 * Enforces method call ordering and wires the event bus to the adapter.
 */

import { CheckoutEventBus } from './event-bus.js';
import { globalRegistry } from './adapter-registry.js';
import {
  type APMAdapter,
  type CheckoutConfig,
  type CheckoutEvent,
  type PaymentData,
  type ServerHandoff,
  type RenderOptions,
  UniversalEventType,
  ErrorCode,
} from './types.js';

export class CheckoutManager {
  private adapter: APMAdapter;
  private config: CheckoutConfig;
  private eventBus: CheckoutEventBus;
  private initialized = false;
  private rendered = false;

  constructor(config: CheckoutConfig) {
    const adapter = globalRegistry.get(config.apm);
    if (!adapter) {
      throw new Error(
        `Unknown APM: "${config.apm}". Available: ${globalRegistry.list().join(', ')}`
      );
    }
    this.adapter = adapter;
    this.config = config;
    this.eventBus = new CheckoutEventBus(adapter.supportedEvents);
  }

  on(type: UniversalEventType, handler: (event: CheckoutEvent) => void): this {
    this.eventBus.on(type, handler);
    return this;
  }

  off(type: UniversalEventType, handler?: (event: CheckoutEvent) => void): this {
    this.eventBus.off(type, handler);
    return this;
  }

  isEventSupported(type: UniversalEventType): boolean {
    return this.eventBus.isSupported(type);
  }

  async init(): Promise<void> {
    if (this.initialized) return; // idempotent

    try {
      await this.adapter.loadSDK(this.config);
    } catch (err) {
      this.eventBus.emit({
        type: UniversalEventType.PAYMENT_ERROR,
        apm: this.adapter.id,
        data: {
          code: ErrorCode.SCRIPT_LOAD_FAILED,
          message: err instanceof Error ? err.message : String(err),
          retryable: false,
        },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }

    try {
      await this.adapter.init(this.config, this.eventBus);
      this.initialized = true;
    } catch (err) {
      this.eventBus.emit({
        type: UniversalEventType.PAYMENT_ERROR,
        apm: this.adapter.id,
        data: {
          code: ErrorCode.INIT_FAILED,
          message: err instanceof Error ? err.message : String(err),
          retryable: false,
        },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  async render(options?: RenderOptions): Promise<void> {
    this.assertInitialized('render');
    const containerId = this.config.containerId;
    if (!containerId) {
      throw new Error('containerId is required in config for render()');
    }
    const container = document.getElementById(containerId);
    if (!container) {
      this.eventBus.emit({
        type: UniversalEventType.PAYMENT_ERROR,
        apm: this.adapter.id,
        data: {
          code: ErrorCode.RENDER_FAILED,
          message: `Container #${containerId} not found in DOM`,
          retryable: true,
        },
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Container #${containerId} not found`);
    }

    await this.adapter.render(container, options);
    this.rendered = true;
  }

  async authorize(paymentData?: Partial<PaymentData>): Promise<void> {
    this.assertInitialized('authorize');
    const data: PaymentData = {
      amount: this.config.amount,
      merchantOrderId: this.config.merchantOrderId,
      customer: this.config.customer,
      shippingAddress: this.config.shippingAddress,
      billingAddress: this.config.billingAddress,
      items: this.config.items,
      returnUrls: this.config.returnUrls,
      ...paymentData,
    };
    await this.adapter.authorize(data);
  }

  async handleRedirectReturn(queryParams?: Record<string, string>): Promise<void> {
    this.assertInitialized('handleRedirectReturn');
    const params = queryParams ?? Object.fromEntries(new URLSearchParams(window.location.search));
    await this.adapter.handleRedirectReturn(params);
  }

  getServerHandoff(): ServerHandoff {
    return this.adapter.getServerHandoff();
  }

  getEventLog(): ReadonlyArray<CheckoutEvent> {
    return this.eventBus.getEventLog();
  }

  getAdapterId(): string {
    return this.adapter.id;
  }

  getPattern(): string {
    return this.adapter.pattern;
  }

  teardown(): void {
    this.adapter.teardown();
    this.eventBus.destroy();
    this.initialized = false;
    this.rendered = false;
  }

  private assertInitialized(method: string): void {
    if (!this.initialized) {
      const err = new Error(`Adapter not initialized. Call init() before ${method}()`);
      this.eventBus.emit({
        type: UniversalEventType.PAYMENT_ERROR,
        apm: this.config.apm,
        data: {
          code: ErrorCode.INIT_FAILED,
          message: err.message,
          retryable: false,
        },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }
}

export function createCheckout(config: CheckoutConfig): CheckoutManager {
  return new CheckoutManager(config);
}
