import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const trustlyAdapter = createPproAdapter({
  code: 'TRUSTLY',
  displayName: 'Trustly',
  country: 'DE',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#0EE06E',
  buttonLabel: 'Pay with Trustly',
  logoUrl: '/logos/trustly.svg',
  authType: 'REDIRECT',
});
