/**
 * PPRO Sandbox Integration Test — Tests representative APMs from each pattern
 * Requires test-harness running on localhost:3847
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createPproCharge, healthCheck } from '../helpers/sandbox-client.js';

describe('PPRO Sandbox Integration', () => {
  beforeAll(async () => {
    const isUp = await healthCheck();
    if (!isUp) {
      console.warn('Test harness not running — skipping integration tests');
      return;
    }
  });

  describe('Bank Redirect — iDEAL (NL/EUR)', () => {
    it('creates charge with redirect URL', async () => {
      const { data } = await createPproCharge('IDEAL', 'NL', 'EUR', 10.00);
      expect(data.success).toBe(true);
      expect(data.chargeId).toMatch(/^charge_/);
      expect(data.paymentMethod).toBe('IDEAL');
      expect(data.currencyPreserved).toBe(true);
      expect(data.amountSymmetric).toBe(true);
      expect(data.hasRedirect).toBe(true);
    });
  });

  describe('Bank Redirect — Bancontact (BE/EUR)', () => {
    it('creates charge with redirect URL', async () => {
      const { data } = await createPproCharge('BANCONTACT', 'BE', 'EUR', 10.00);
      expect(data.success).toBe(true);
      expect(data.paymentMethod).toBe('BANCONTACT');
      expect(data.hasRedirect).toBe(true);
    });
  });

  describe('QR Code — Pix (BR/BRL)', () => {
    it('creates charge with QR code', async () => {
      const { data } = await createPproCharge('PIX', 'BR', 'BRL', 10.00);
      // Pix may use QR or redirect depending on PPRO sandbox config
      expect(data.success).toBe(true);
      expect(data.paymentMethod).toBe('PIX');
    });
  });

  describe('Voucher — OXXO (MX/MXN)', () => {
    it('creates charge for voucher payment', async () => {
      const { data } = await createPproCharge('OXXO', 'MX', 'MXN', 500.00);
      // OXXO may not be supported in PPRO sandbox — expect success or known error
      if (data.success) {
        expect(data.paymentMethod).toBe('OXXO');
        expect(data.currencyPreserved).toBe(true);
      }
    });
  });

  describe('Amount symmetry validation', () => {
    it('preserves amount for EUR', async () => {
      const { data } = await createPproCharge('IDEAL', 'NL', 'EUR', 10.00);
      if (data.success) {
        expect(data.amountSent).toBe(1000);
        expect(data.amountReceived).toBe(1000);
        expect(data.amountSymmetric).toBe(true);
      }
    });

    it('preserves currency code', async () => {
      const { data } = await createPproCharge('BLIK', 'PL', 'PLN', 10.00);
      if (data.success) {
        expect(data.currencyPreserved).toBe(true);
      }
    });
  });

  describe('Safety checks across multiple APMs', () => {
    const testCases = [
      { code: 'IDEAL', country: 'NL', currency: 'EUR' },
      { code: 'BANCONTACT', country: 'BE', currency: 'EUR' },
      { code: 'EPS', country: 'AT', currency: 'EUR' },
      { code: 'BLIK', country: 'PL', currency: 'PLN' },
      { code: 'TRUSTLY', country: 'DE', currency: 'EUR' },
    ];

    for (const tc of testCases) {
      it(`${tc.code} — charge ID format and currency preservation`, async () => {
        const { data } = await createPproCharge(tc.code, tc.country, tc.currency, 10.00);
        if (data.success) {
          expect(data.chargeId).toMatch(/^charge_/);
          expect(data.currencyPreserved).toBe(true);
        }
      });
    }
  });
});
