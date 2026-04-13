/**
 * Event Bus — Pub/sub with event ordering enforcement and error boundaries.
 *
 * Event Ordering Guarantees:
 * 1. PAYMENT_METHOD_READY — always first
 * 2. Flow-specific (REDIRECT_REQUIRED, QR_CODE_GENERATED, VOUCHER_CODE_GENERATED, PHONE_NUMBER_REQUIRED)
 * 3. Customer interaction (SHIPPING_ADDRESS_CHANGED, etc. — any order, repeatable)
 * 4. Terminal (PAYMENT_AUTHORIZED, PAYMENT_CANCELLED, PAYMENT_ERROR, VOUCHER_EXPIRED) — exactly one
 */
import { UniversalEventType, TERMINAL_EVENTS, } from './types.js';
export class CheckoutEventBus {
    constructor(supported) {
        this.handlers = new Map();
        this.supportedEvents = new Set();
        this.readyFired = false;
        this.terminalFired = false;
        this.eventLog = [];
        this.destroyed = false;
        if (supported) {
            supported.forEach((e) => this.supportedEvents.add(e));
        }
    }
    setSupportedEvents(events) {
        this.supportedEvents.clear();
        events.forEach((e) => this.supportedEvents.add(e));
    }
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
    }
    off(type, handler) {
        if (!handler) {
            this.handlers.delete(type);
            return;
        }
        this.handlers.get(type)?.delete(handler);
    }
    isSupported(type) {
        return this.supportedEvents.has(type);
    }
    emit(event) {
        if (this.destroyed)
            return;
        // Enforce ordering: terminal events cannot fire before PAYMENT_METHOD_READY
        if (TERMINAL_EVENTS.has(event.type) && !this.readyFired) {
            // Allow PAYMENT_ERROR before ready (e.g., SCRIPT_LOAD_FAILED)
            if (event.type !== UniversalEventType.PAYMENT_ERROR) {
                console.warn(`[CheckoutSDK] Event ordering violation: ${event.type} fired before PAYMENT_METHOD_READY`);
            }
        }
        // Track PAYMENT_METHOD_READY
        if (event.type === UniversalEventType.PAYMENT_METHOD_READY) {
            this.readyFired = true;
        }
        // Enforce: only one terminal event per flow
        if (TERMINAL_EVENTS.has(event.type)) {
            if (this.terminalFired) {
                console.warn(`[CheckoutSDK] Duplicate terminal event: ${event.type} (already received a terminal event)`);
                return;
            }
            this.terminalFired = true;
        }
        // Log for debugging
        this.eventLog.push(event);
        // Dispatch to handlers with error boundary
        const handlers = this.handlers.get(event.type);
        if (!handlers || handlers.size === 0)
            return;
        for (const handler of handlers) {
            try {
                handler(event);
            }
            catch (err) {
                console.error(`[CheckoutSDK] Error in ${event.type} handler:`, err);
            }
        }
    }
    getEventLog() {
        return [...this.eventLog];
    }
    reset() {
        this.readyFired = false;
        this.terminalFired = false;
        this.eventLog = [];
    }
    destroy() {
        this.handlers.clear();
        this.supportedEvents.clear();
        this.eventLog = [];
        this.readyFired = false;
        this.terminalFired = false;
        this.destroyed = true;
    }
}
//# sourceMappingURL=event-bus.js.map