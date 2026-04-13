import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const mercadopagoAdapter = createPproAdapter({
  code: 'MERCADOPAGO',
  displayName: 'Mercado Pago',
  country: 'AR',
  currency: 'ARS',
  pattern: 'redirect-wallet',
  brandColor: '#009EE3',
  buttonLabel: 'Pay with Mercado Pago',
  logoUrl: '/logos/mercadopago.svg',
  authType: 'REDIRECT',
});
