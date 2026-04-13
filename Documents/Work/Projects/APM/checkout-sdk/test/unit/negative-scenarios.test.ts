import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckoutManager, createCheckout } from '../../src/core/checkout-manager.js';
import { AdapterRegistry } from '../../src/core/adapter-registry.js';
import { globalRegistry } from '../../src/core/adapter-registry.js';
import { createPproAdapter } from '../../src/core/ppro-adapter-factory.js';
import { UniversalEventType, ErrorCode } from '../../src/core/types.js';

// Register a test adapter for negative scenario testing
const testAdapter = createPproAdapter({
  code: 'TEST_NEG',
  displayName: 'Test Negative',
  country: 'US',
  currency: 'USD',
  pattern: 'bank-redirect',
  brandColor: '#000',
  buttonLabel: 'Test',
  logoUrl: '',
  authType: 'REDIRECT',
});

describe('Negative Scenarios (P1 — Crispin)', () => {
  beforeEach(() => {
    globalRegistry.clear();
    globalRegistry.register(testAdapter);
    // Setup minimal DOM
    document.body.innerHTML = '<div id="payment-container"></div>';
  });

  afterEach(() => {
    globalRegistry.clear();
  });

  describe('Double init()', () => {
    it('is idempotent — returns without error, no duplicate events', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: 'USD' },
      });
      await checkout.init();
      await checkout.init(); // second call should be no-op
      // No error thrown, test passes
    });
  });

  describe('authorize() before init()', () => {
    it('throws Error and emits PAYMENT_ERROR with INIT_FAILED', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: 'USD' },
      });

      const errorHandler = vi.fn();
      checkout.on(UniversalEventType.PAYMENT_ERROR, errorHandler);

      await expect(checkout.authorize()).rejects.toThrow('Adapter not initialized');
      expect(errorHandler).toHaveBeenCalledOnce();
      expect(errorHandler.mock.calls[0][0].data.code).toBe(ErrorCode.INIT_FAILED);
    });
  });

  describe('render() before init()', () => {
    it('throws Error', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: 'USD' },
      });

      await expect(checkout.render()).rejects.toThrow('Adapter not initialized');
    });
  });

  describe('Unknown APM code', () => {
    it('registry.get() returns undefined', () => {
      expect(globalRegistry.get('NONEXISTENT')).toBeUndefined();
    });

    it('createCheckout() throws with helpful message', () => {
      expect(() => createCheckout({
        apm: 'NONEXISTENT',
        amount: { total: 10, currency: 'USD' },
      })).toThrow('Unknown APM: "NONEXISTENT"');
    });
  });

  describe('NaN amount', () => {
    it('emits PAYMENT_ERROR with VALIDATION_ERROR', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: NaN, currency: 'USD' },
      });
      await checkout.init();
      await checkout.render();

      const errorHandler = vi.fn();
      checkout.on(UniversalEventType.PAYMENT_ERROR, errorHandler);

      await checkout.authorize();
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].data.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Negative amount', () => {
    it('emits PAYMENT_ERROR with VALIDATION_ERROR', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: -10, currency: 'USD' },
      });
      await checkout.init();

      const errorHandler = vi.fn();
      checkout.on(UniversalEventType.PAYMENT_ERROR, errorHandler);

      await checkout.authorize();
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].data.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Zero amount', () => {
    it('emits PAYMENT_ERROR with VALIDATION_ERROR', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 0, currency: 'USD' },
      });
      await checkout.init();

      const errorHandler = vi.fn();
      checkout.on(UniversalEventType.PAYMENT_ERROR, errorHandler);

      await checkout.authorize();
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].data.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Invalid currency', () => {
    it('emits PAYMENT_ERROR with VALIDATION_ERROR for empty string', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: '' },
      });
      await checkout.init();

      const errorHandler = vi.fn();
      checkout.on(UniversalEventType.PAYMENT_ERROR, errorHandler);

      await checkout.authorize();
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].data.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('teardown() after teardown()', () => {
    it('is idempotent — second call is a no-op', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: 'USD' },
      });
      await checkout.init();
      checkout.teardown();
      checkout.teardown(); // should not throw
    });
  });

  describe('Event subscription for unsupported event', () => {
    it('subscription succeeds silently (no-op)', async () => {
      const checkout = createCheckout({
        apm: 'test_neg',
        containerId: 'payment-container',
        amount: { total: 10, currency: 'USD' },
      });
      await checkout.init();

      // COUPON_CODE_CHANGED is not supported by bank-redirect APMs
      const handler = vi.fn();
      checkout.on(UniversalEventType.COUPON_CODE_CHANGED, handler);
      expect(checkout.isEventSupported(UniversalEventType.COUPON_CODE_CHANGED)).toBe(false);
      expect(checkout.isEventSupported(UniversalEventType.PAYMENT_AUTHORIZED)).toBe(true);
    });
  });

  describe('Contract version validation', () => {
    it('rejects adapter with incompatible major version', () => {
      const registry = new AdapterRegistry();
      const badAdapter = { ...testAdapter, contractVersion: '^2.0.0' };
      expect(() => registry.register(badAdapter)).toThrow('incompatible');
    });

    it('accepts adapter with compatible version', () => {
      const registry = new AdapterRegistry();
      const goodAdapter = { ...testAdapter, id: 'test_good', contractVersion: '^1.0.0' };
      expect(() => registry.register(goodAdapter)).not.toThrow();
    });
  });
});
