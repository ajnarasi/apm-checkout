import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const alipayPproAdapter = createPproAdapter({
  code: 'ALIPAY',
  displayName: 'Alipay',
  country: 'CN',
  currency: 'CNY',
  pattern: 'qr-code',
  brandColor: '#1677FF',
  buttonLabel: 'Pay with Alipay',
  logoUrl: '/logos/alipay.svg',
  authType: 'SCAN_CODE',
  dualMode: true,
});
