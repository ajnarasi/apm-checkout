/**
 * Event Bus — Pub/sub with event ordering enforcement and error boundaries.
 *
 * Event Ordering Guarantees:
 * 1. PAYMENT_METHOD_READY — always first
 * 2. Flow-specific (REDIRECT_REQUIRED, QR_CODE_GENERATED, VOUCHER_CODE_GENERATED, PHONE_NUMBER_REQUIRED)
 * 3. Customer interaction (SHIPPING_ADDRESS_CHANGED, etc. — any order, repeatable)
 * 4. Terminal (PAYMENT_AUTHORIZED, PAYMENT_CANCELLED, PAYMENT_ERROR, VOUCHER_EXPIRED) — exactly one
 */
import { type CheckoutEvent, type EventBus as IEventBus, UniversalEventType } from './types.js';
type EventHandler = (event: CheckoutEvent) => void;
export declare class CheckoutEventBus implements IEventBus {
    private handlers;
    private supportedEvents;
    private readyFired;
    private terminalFired;
    private eventLog;
    constructor(supported?: ReadonlyArray<UniversalEventType>);
    setSupportedEvents(events: ReadonlyArray<UniversalEventType>): void;
    on(type: UniversalEventType, handler: EventHandler): void;
    off(type: UniversalEventType, handler?: EventHandler): void;
    isSupported(type: UniversalEventType): boolean;
    private destroyed;
    emit<T = Record<string, unknown>>(event: CheckoutEvent<T>): void;
    getEventLog(): ReadonlyArray<CheckoutEvent>;
    reset(): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=event-bus.d.ts.map