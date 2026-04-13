import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const speiAdapter = createPproAdapter({
  code: 'SPEI',
  displayName: 'SPEI',
  country: 'MX',
  currency: 'MXN',
  pattern: 'bank-redirect',
  brandColor: '#004B87',
  buttonLabel: 'Pay with SPEI',
  logoUrl: '/logos/spei.svg',
  authType: 'REDIRECT',
});
