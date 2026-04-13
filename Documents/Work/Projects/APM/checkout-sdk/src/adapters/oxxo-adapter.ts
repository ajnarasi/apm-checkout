import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const oxxoAdapter = createPproAdapter({
  code: 'OXXO',
  displayName: 'OXXO',
  country: 'MX',
  currency: 'MXN',
  pattern: 'voucher-cash',
  brandColor: '#CD1B2A',
  buttonLabel: 'Pay with OXXO',
  logoUrl: '/logos/oxxo.svg',
  authType: 'REDIRECT',
  voucherExpiry: '72h',});
