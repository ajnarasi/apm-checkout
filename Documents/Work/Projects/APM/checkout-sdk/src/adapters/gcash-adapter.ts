import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const gcashAdapter = createPproAdapter({
  code: 'GCASH',
  displayName: 'GCash',
  country: 'PH',
  currency: 'PHP',
  pattern: 'redirect-wallet',
  brandColor: '#007DFE',
  buttonLabel: 'Pay with GCash',
  logoUrl: '/logos/gcash.svg',
  authType: 'REDIRECT',
});
