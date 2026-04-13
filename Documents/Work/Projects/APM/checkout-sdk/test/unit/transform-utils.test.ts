import { describe, it, expect } from 'vitest';
import {
  multiply100,
  divide100,
  numberToString,
  stringToNumber,
  decimalToStringCents,
  stringCentsToDecimal,
  mapEnum,
  concat,
  validateAmount,
  validateCurrency,
  applyTransform,
} from '../../src/core/transform-utils.js';

describe('Transform Utils', () => {
  describe('multiply100 / divide100 (MULTIPLY_100 / DIVIDE_100)', () => {
    it('converts standard amounts', () => {
      expect(multiply100(50.00)).toBe(5000);
      expect(multiply100(10.00)).toBe(1000);
      expect(divide100(5000)).toBe(50.00);
      expect(divide100(1000)).toBe(10.00);
    });

    it('handles edge case: $0.01 (minimum)', () => {
      expect(multiply100(0.01)).toBe(1);
      expect(divide100(1)).toBe(0.01);
    });

    it('handles edge case: $99.99', () => {
      expect(multiply100(99.99)).toBe(9999);
      expect(divide100(9999)).toBe(99.99);
    });

    it('handles edge case: $999.99', () => {
      expect(multiply100(999.99)).toBe(99999);
    });

    it('ensures round-trip symmetry', () => {
      const amounts = [0.01, 1.00, 25.00, 50.00, 99.99, 999.99, 1234.56];
      for (const amt of amounts) {
        expect(divide100(multiply100(amt))).toBe(amt);
      }
    });

    it('throws on NaN', () => {
      expect(() => multiply100(NaN)).toThrow('non-finite');
      expect(() => divide100(NaN)).toThrow('non-finite');
    });

    it('throws on Infinity', () => {
      expect(() => multiply100(Infinity)).toThrow('non-finite');
    });
  });

  describe('numberToString / stringToNumber (NUMBER_TO_STRING / STRING_TO_NUMBER)', () => {
    it('converts Afterpay-style string decimals', () => {
      expect(numberToString(50.00)).toBe('50.00');
      expect(numberToString(0.01)).toBe('0.01');
      expect(stringToNumber('50.00')).toBe(50.00);
      expect(stringToNumber('0.01')).toBe(0.01);
    });

    it('throws on invalid input', () => {
      expect(() => numberToString(NaN)).toThrow('non-finite');
      expect(() => stringToNumber('abc')).toThrow('Cannot parse');
    });
  });

  describe('decimalToStringCents / stringCentsToDecimal', () => {
    it('converts Alipay+ style (decimal → string cents)', () => {
      expect(decimalToStringCents(10.00)).toBe('1000');
      expect(stringCentsToDecimal('1000')).toBe(10.00);
    });

    it('round-trip symmetry', () => {
      expect(stringCentsToDecimal(decimalToStringCents(50.00))).toBe(50.00);
    });
  });

  describe('mapEnum (MAP_ENUM)', () => {
    it('maps known values', () => {
      const map = { APPROVED: 'AUTHORIZED', DECLINED: 'DECLINED', PENDING: 'PENDING' };
      expect(mapEnum('APPROVED', map)).toBe('AUTHORIZED');
      expect(mapEnum('DECLINED', map)).toBe('DECLINED');
    });

    it('throws on unknown value without fallback', () => {
      expect(() => mapEnum('UNKNOWN', { A: 'B' })).toThrow('No mapping');
    });

    it('returns fallback for unknown value', () => {
      expect(mapEnum('UNKNOWN', { A: 'B' }, 'DEFAULT' as string)).toBe('DEFAULT');
    });
  });

  describe('concat (CONCAT)', () => {
    it('concatenates name parts', () => {
      expect(concat(['Jane', 'Smith'])).toBe('Jane Smith');
    });

    it('filters empty values', () => {
      expect(concat(['Jane', '', 'Smith'])).toBe('Jane Smith');
    });
  });

  describe('validateAmount', () => {
    it('passes for valid amounts', () => {
      expect(() => validateAmount(50.00)).not.toThrow();
      expect(() => validateAmount(0.01)).not.toThrow();
    });

    it('rejects NaN', () => {
      expect(() => validateAmount(NaN)).toThrow('must be a finite number');
    });

    it('rejects negative', () => {
      expect(() => validateAmount(-10)).toThrow('must be non-negative');
    });

    it('rejects zero', () => {
      expect(() => validateAmount(0)).toThrow('must be greater than zero');
    });
  });

  describe('validateCurrency', () => {
    it('passes for valid ISO 4217 codes', () => {
      expect(() => validateCurrency('USD')).not.toThrow();
      expect(() => validateCurrency('EUR')).not.toThrow();
      expect(() => validateCurrency('BRL')).not.toThrow();
    });

    it('rejects invalid codes', () => {
      expect(() => validateCurrency('XXX')).not.toThrow(); // XXX is technically valid ISO
      expect(() => validateCurrency('')).toThrow('Invalid currency');
      expect(() => validateCurrency('US')).toThrow('must be 3-letter');
      expect(() => validateCurrency('USDD')).toThrow('must be 3-letter');
    });
  });

  describe('applyTransform', () => {
    it('routes to correct transform by name', () => {
      expect(applyTransform(50.00, 'MULTIPLY_100')).toBe(5000);
      expect(applyTransform(5000, 'DIVIDE_100')).toBe(50.00);
      expect(applyTransform(50.00, 'NUMBER_TO_STRING')).toBe('50.00');
      expect(applyTransform('50.00', 'STRING_TO_NUMBER')).toBe(50.00);
      expect(applyTransform(50.00, 'PASSTHROUGH')).toBe(50.00);
      expect(applyTransform(50.00, 'NONE')).toBe(50.00);
    });

    it('handles MAP_ENUM with options', () => {
      expect(applyTransform('APPROVED', 'MAP_ENUM', { enumMap: { APPROVED: 'AUTHORIZED' } })).toBe('AUTHORIZED');
    });

    it('throws on unknown transform', () => {
      expect(() => applyTransform(50, 'UNKNOWN_TRANSFORM')).toThrow('Unknown transform');
    });
  });
});
