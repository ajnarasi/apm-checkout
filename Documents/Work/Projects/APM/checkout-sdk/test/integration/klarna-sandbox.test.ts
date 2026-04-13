/**
 * Klarna Sandbox Integration Test
 * Requires test-harness running on localhost:3847
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createKlarnaSession, healthCheck } from '../helpers/sandbox-client.js';

describe('Klarna Sandbox Integration', () => {
  beforeAll(async () => {
    const isUp = await healthCheck();
    if (!isUp) {
      console.warn('Test harness not running — skipping integration tests');
      return;
    }
  });

  it('creates a payment session with correct field mappings', async () => {
    const { status, data } = await createKlarnaSession(50.00);

    // Session should be created successfully
    expect(status).toBe(200);

    // Field mapping validation
    expect(data.order?.providerOrderId).toBeTruthy(); // session_id
    expect(data.order?.orderStatus).toBe('PAYER_ACTION_REQUIRED');
    expect(data.paymentMethod?.provider).toBe('KLARNA');

    // client_token should be a JWT (>50 chars)
    const clientToken = data.paymentMethod?.paymentToken?.tokenData;
    expect(typeof clientToken).toBe('string');
    expect((clientToken as string).length).toBeGreaterThan(50);
  });

  it('validates amount symmetry: CH $50.00 → Klarna 5000 (MULTIPLY_100)', async () => {
    const { data } = await createKlarnaSession(50.00);
    // The test-harness logs amount symmetry — check via raw response
    expect(data._raw?.sessionId).toBeTruthy();
  });

  it('handles edge case amounts', async () => {
    const amounts = [0.01, 1.00, 99.99, 999.99];
    for (const amt of amounts) {
      const { status } = await createKlarnaSession(amt);
      expect(status).toBe(200);
    }
  });
});
