import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutEventBus } from '../../src/core/event-bus.js';
import { UniversalEventType } from '../../src/core/types.js';

function makeEvent(type: UniversalEventType, data: Record<string, unknown> = {}) {
  return { type, apm: 'test', data, timestamp: new Date().toISOString() };
}

describe('CheckoutEventBus', () => {
  let bus: CheckoutEventBus;

  beforeEach(() => {
    bus = new CheckoutEventBus();
  });

  it('dispatches events to subscribed handlers', () => {
    const handler = vi.fn();
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, handler);
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED, { token: 'abc' }));
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].data).toEqual({ token: 'abc' });
  });

  it('does not dispatch to unsubscribed handlers', () => {
    const handler = vi.fn();
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, handler);
    bus.off(UniversalEventType.PAYMENT_AUTHORIZED, handler);
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
    expect(handler).not.toHaveBeenCalled();
  });

  it('off() without handler removes all handlers for event type', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, h1);
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, h2);
    bus.off(UniversalEventType.PAYMENT_AUTHORIZED);
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  describe('event ordering', () => {
    it('allows PAYMENT_ERROR before PAYMENT_METHOD_READY (script load failure)', () => {
      const handler = vi.fn();
      bus.on(UniversalEventType.PAYMENT_ERROR, handler);
      bus.emit(makeEvent(UniversalEventType.PAYMENT_ERROR, { code: 'SCRIPT_LOAD_FAILED' }));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('warns when non-error terminal event fires before PAYMENT_METHOD_READY', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ordering violation'));
      warn.mockRestore();
    });

    it('blocks duplicate terminal events', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on(UniversalEventType.PAYMENT_AUTHORIZED, h1);
      bus.on(UniversalEventType.PAYMENT_CANCELLED, h2);
      bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
      bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
      bus.emit(makeEvent(UniversalEventType.PAYMENT_CANCELLED)); // should be blocked
      expect(h1).toHaveBeenCalledOnce();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  it('isolates handler errors (error boundary)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = vi.fn(() => { throw new Error('boom'); });
    const goodHandler = vi.fn();
    bus.on(UniversalEventType.PAYMENT_METHOD_READY, badHandler);
    bus.on(UniversalEventType.PAYMENT_METHOD_READY, goodHandler);
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    expect(badHandler).toHaveBeenCalledOnce();
    expect(goodHandler).toHaveBeenCalledOnce(); // still called despite error in badHandler
    errorSpy.mockRestore();
  });

  it('tracks event log', () => {
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    bus.emit(makeEvent(UniversalEventType.REDIRECT_REQUIRED, { url: 'https://bank.com' }));
    const log = bus.getEventLog();
    expect(log).toHaveLength(2);
    expect(log[0].type).toBe(UniversalEventType.PAYMENT_METHOD_READY);
    expect(log[1].type).toBe(UniversalEventType.REDIRECT_REQUIRED);
  });

  it('reset() clears state for new payment flow', () => {
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
    bus.reset();
    // After reset, should be able to fire new terminal event
    const handler = vi.fn();
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, handler);
    bus.emit(makeEvent(UniversalEventType.PAYMENT_METHOD_READY));
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
    expect(handler).toHaveBeenCalledOnce();
    expect(bus.getEventLog()).toHaveLength(2);
  });

  it('isSupported() reflects adapter capabilities', () => {
    bus.setSupportedEvents([UniversalEventType.PAYMENT_AUTHORIZED, UniversalEventType.QR_CODE_GENERATED]);
    expect(bus.isSupported(UniversalEventType.PAYMENT_AUTHORIZED)).toBe(true);
    expect(bus.isSupported(UniversalEventType.QR_CODE_GENERATED)).toBe(true);
    expect(bus.isSupported(UniversalEventType.COUPON_CODE_CHANGED)).toBe(false);
  });

  it('destroy() clears all state and handlers', () => {
    const handler = vi.fn();
    bus.on(UniversalEventType.PAYMENT_AUTHORIZED, handler);
    bus.destroy();
    bus.emit(makeEvent(UniversalEventType.PAYMENT_AUTHORIZED));
    expect(handler).not.toHaveBeenCalled();
    expect(bus.getEventLog()).toHaveLength(0);
  });
});
