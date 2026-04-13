import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const touchngoAdapter = createPproAdapter({
  code: 'TOUCHNGO',
  displayName: 'Touch n Go',
  country: 'MY',
  currency: 'MYR',
  pattern: 'redirect-wallet',
  brandColor: '#005ABB',
  buttonLabel: 'Pay with Touch n Go',
  logoUrl: '/logos/touchngo.svg',
  authType: 'REDIRECT',
});
