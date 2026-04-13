import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const vippsAdapter = createPproAdapter({
  code: 'VIPPS',
  displayName: 'Vipps',
  country: 'NO',
  currency: 'NOK',
  pattern: 'redirect-wallet',
  brandColor: '#FF5B24',
  buttonLabel: 'Pay with Vipps',
  logoUrl: '/logos/vipps.svg',
  authType: 'REDIRECT',
});
