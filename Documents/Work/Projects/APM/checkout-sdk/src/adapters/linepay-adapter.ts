import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const linepayAdapter = createPproAdapter({
  code: 'LINEPAY',
  displayName: 'LINE Pay',
  country: 'TH',
  currency: 'THB',
  pattern: 'redirect-wallet',
  brandColor: '#00C300',
  buttonLabel: 'Pay with LINE Pay',
  logoUrl: '/logos/linepay.svg',
  authType: 'REDIRECT',
});
