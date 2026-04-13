import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const sofortAdapter = createPproAdapter({
  code: 'SOFORT',
  displayName: 'Sofort',
  country: 'DE',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#EF809F',
  buttonLabel: 'Pay with Sofort',
  logoUrl: '/logos/sofort.svg',
  authType: 'REDIRECT',
});
