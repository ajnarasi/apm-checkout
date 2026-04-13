import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const weroAdapter = createPproAdapter({
  code: 'WERO',
  displayName: 'Wero',
  country: 'DE',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#4E89FF',
  buttonLabel: 'Pay with Wero',
  logoUrl: '/logos/wero.svg',
  authType: 'REDIRECT',
});
