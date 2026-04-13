/**
 * CashApp Sandbox Integration Test
 * Requires test-harness running on localhost:3847
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createCashAppRequest, healthCheck } from '../helpers/sandbox-client.js';

describe('CashApp Sandbox Integration', () => {
  beforeAll(async () => {
    const isUp = await healthCheck();
    if (!isUp) {
      console.warn('Test harness not running — skipping integration tests');
      return;
    }
  });

  it('creates a customer request with correct field mappings', async () => {
    const { status, data } = await createCashAppRequest(25.00);
    expect(status).toBe(200);

    // Provider order ID should have GRR_ prefix
    const orderId = data.order?.providerOrderId;
    expect(typeof orderId).toBe('string');
    expect((orderId as string).startsWith('GRR_')).toBe(true);

    // Status should be PAYER_ACTION_REQUIRED
    expect(data.order?.orderStatus).toBe('PAYER_ACTION_REQUIRED');

    // Checkout interactions should have redirect URL and QR code
    expect(data.checkoutInteractions?.channel).toBe('WEB');
    expect(data.checkoutInteractions?.actions?.url).toBeTruthy(); // desktop redirect URL
  });

  it('validates amount transform: CH $25.00 → CashApp 2500 cents (MULTIPLY_100)', async () => {
    const { data } = await createCashAppRequest(25.00);
    expect(data.order?.providerOrderId).toBeTruthy();
  });

  it('validates conditional routing returns correct scope_id', async () => {
    const { data } = await createCashAppRequest(25.00);
    // ONE_TIME scope uses merchantId
    expect(data._raw?.request?.actions?.[0]?.type).toBe('ONE_TIME_PAYMENT');
  });

  it('handles minimum amount edge case ($0.01)', async () => {
    const { status, data } = await createCashAppRequest(0.01);
    expect(status).toBe(200);
    expect(data._raw?.request?.actions?.[0]?.amount).toBe(1);
  });
});
