import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const twintAdapter = createPproAdapter({
  code: 'TWINT',
  displayName: 'TWINT',
  country: 'CH',
  currency: 'CHF',
  pattern: 'qr-code',
  brandColor: '#000000',
  buttonLabel: 'Pay with TWINT',
  logoUrl: '/logos/twint.svg',
  authType: 'SCAN_CODE',
});
