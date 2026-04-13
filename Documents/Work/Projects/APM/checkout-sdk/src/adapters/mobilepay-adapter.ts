import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const mobilepayAdapter = createPproAdapter({
  code: 'MOBILEPAY',
  displayName: 'MobilePay',
  country: 'DK',
  currency: 'DKK',
  pattern: 'redirect-wallet',
  brandColor: '#5A78FF',
  buttonLabel: 'Pay with MobilePay',
  logoUrl: '/logos/mobilepay.svg',
  authType: 'REDIRECT',
});
