import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const danaAdapter = createPproAdapter({
  code: 'DANA',
  displayName: 'DANA',
  country: 'ID',
  currency: 'IDR',
  pattern: 'redirect-wallet',
  brandColor: '#118EEA',
  buttonLabel: 'Pay with DANA',
  logoUrl: '/logos/dana.svg',
  authType: 'REDIRECT',
});
