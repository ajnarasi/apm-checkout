import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const boletoAdapter = createPproAdapter({
  code: 'BOLETO',
  displayName: 'Boleto',
  country: 'BR',
  currency: 'BRL',
  pattern: 'voucher-cash',
  brandColor: '#F7941E',
  buttonLabel: 'Pay with Boleto',
  logoUrl: '/logos/boleto.svg',
  authType: 'REDIRECT',
  voucherExpiry: '7d',});
