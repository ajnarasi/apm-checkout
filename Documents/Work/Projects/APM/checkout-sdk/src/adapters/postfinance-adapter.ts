import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const postfinanceAdapter = createPproAdapter({
  code: 'POSTFINANCE',
  displayName: 'PostFinance',
  country: 'CH',
  currency: 'CHF',
  pattern: 'bank-redirect',
  brandColor: '#FFCC00',
  buttonLabel: 'Pay with PostFinance',
  logoUrl: '/logos/postfinance.svg',
  authType: 'REDIRECT',
});
