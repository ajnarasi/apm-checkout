/**
 * Checkout Manager — Orchestrator for the payment lifecycle.
 *
 * Manages: init → render → authorize → handleRedirectReturn → getServerHandoff
 * Enforces method call ordering and wires the event bus to the adapter.
 */
import { type CheckoutConfig, type CheckoutEvent, type PaymentData, type ServerHandoff, type RenderOptions, UniversalEventType } from './types.js';
export declare class CheckoutManager {
    private adapter;
    private config;
    private eventBus;
    private initialized;
    private rendered;
    constructor(config: CheckoutConfig);
    on(type: UniversalEventType, handler: (event: CheckoutEvent) => void): this;
    off(type: UniversalEventType, handler?: (event: CheckoutEvent) => void): this;
    isEventSupported(type: UniversalEventType): boolean;
    init(): Promise<void>;
    render(options?: RenderOptions): Promise<void>;
    authorize(paymentData?: Partial<PaymentData>): Promise<void>;
    handleRedirectReturn(queryParams?: Record<string, string>): Promise<void>;
    getServerHandoff(): ServerHandoff;
    getEventLog(): ReadonlyArray<CheckoutEvent>;
    getAdapterId(): string;
    getPattern(): string;
    teardown(): void;
    private assertInitialized;
}
export declare function createCheckout(config: CheckoutConfig): CheckoutManager;
//# sourceMappingURL=checkout-manager.d.ts.map