import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const efectyAdapter = createPproAdapter({
  code: 'EFECTY',
  displayName: 'Efecty',
  country: 'CO',
  currency: 'COP',
  pattern: 'voucher-cash',
  brandColor: '#00A651',
  buttonLabel: 'Pay with Efecty',
  logoUrl: '/logos/efecty.svg',
  authType: 'REDIRECT',
  voucherExpiry: '48h',});
