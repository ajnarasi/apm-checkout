import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const kakaopayAdapter = createPproAdapter({
  code: 'KAKAOPAY',
  displayName: 'KakaoPay',
  country: 'KR',
  currency: 'KRW',
  pattern: 'redirect-wallet',
  brandColor: '#FFEB00',
  buttonLabel: 'Pay with KakaoPay',
  logoUrl: '/logos/kakaopay.svg',
  authType: 'REDIRECT',
});
