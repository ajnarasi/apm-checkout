import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const giropayAdapter = createPproAdapter({
  code: 'GIROPAY',
  displayName: 'Giropay',
  country: 'DE',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#003A7D',
  buttonLabel: 'Pay with Giropay',
  logoUrl: '/logos/giropay.svg',
  authType: 'REDIRECT',
});
