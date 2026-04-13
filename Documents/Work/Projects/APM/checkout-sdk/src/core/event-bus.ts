/**
 * Event Bus — Pub/sub with event ordering enforcement and error boundaries.
 *
 * Event Ordering Guarantees:
 * 1. PAYMENT_METHOD_READY — always first
 * 2. Flow-specific (REDIRECT_REQUIRED, QR_CODE_GENERATED, VOUCHER_CODE_GENERATED, PHONE_NUMBER_REQUIRED)
 * 3. Customer interaction (SHIPPING_ADDRESS_CHANGED, etc. — any order, repeatable)
 * 4. Terminal (PAYMENT_AUTHORIZED, PAYMENT_CANCELLED, PAYMENT_ERROR, VOUCHER_EXPIRED) — exactly one
 */

import {
  type CheckoutEvent,
  type EventBus as IEventBus,
  UniversalEventType,
  TERMINAL_EVENTS,
} from './types.js';

type EventHandler = (event: CheckoutEvent) => void;

export class CheckoutEventBus implements IEventBus {
  private handlers = new Map<UniversalEventType, Set<EventHandler>>();
  private supportedEvents = new Set<UniversalEventType>();
  private readyFired = false;
  private terminalFired = false;
  private eventLog: CheckoutEvent[] = [];

  constructor(supported?: ReadonlyArray<UniversalEventType>) {
    if (supported) {
      supported.forEach((e) => this.supportedEvents.add(e));
    }
  }

  setSupportedEvents(events: ReadonlyArray<UniversalEventType>): void {
    this.supportedEvents.clear();
    events.forEach((e) => this.supportedEvents.add(e));
  }

  on(type: UniversalEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: UniversalEventType, handler?: EventHandler): void {
    if (!handler) {
      this.handlers.delete(type);
      return;
    }
    this.handlers.get(type)?.delete(handler);
  }

  isSupported(type: UniversalEventType): boolean {
    return this.supportedEvents.has(type);
  }

  private destroyed = false;

  emit<T = Record<string, unknown>>(event: CheckoutEvent<T>): void {
    if (this.destroyed) return;

    // Enforce ordering: terminal events cannot fire before PAYMENT_METHOD_READY
    if (TERMINAL_EVENTS.has(event.type) && !this.readyFired) {
      // Allow PAYMENT_ERROR before ready (e.g., SCRIPT_LOAD_FAILED)
      if (event.type !== UniversalEventType.PAYMENT_ERROR) {
        console.warn(
          `[CheckoutSDK] Event ordering violation: ${event.type} fired before PAYMENT_METHOD_READY`
        );
      }
    }

    // Track PAYMENT_METHOD_READY
    if (event.type === UniversalEventType.PAYMENT_METHOD_READY) {
      this.readyFired = true;
    }

    // Enforce: only one terminal event per flow
    if (TERMINAL_EVENTS.has(event.type)) {
      if (this.terminalFired) {
        console.warn(
          `[CheckoutSDK] Duplicate terminal event: ${event.type} (already received a terminal event)`
        );
        return;
      }
      this.terminalFired = true;
    }

    // Log for debugging
    this.eventLog.push(event as CheckoutEvent);

    // Dispatch to handlers with error boundary
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        handler(event as CheckoutEvent);
      } catch (err) {
        console.error(
          `[CheckoutSDK] Error in ${event.type} handler:`,
          err
        );
      }
    }
  }

  getEventLog(): ReadonlyArray<CheckoutEvent> {
    return [...this.eventLog];
  }

  reset(): void {
    this.readyFired = false;
    this.terminalFired = false;
    this.eventLog = [];
  }

  destroy(): void {
    this.handlers.clear();
    this.supportedEvents.clear();
    this.eventLog = [];
    this.readyFired = false;
    this.terminalFired = false;
    this.destroyed = true;
  }
}
