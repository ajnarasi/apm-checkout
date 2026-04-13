import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const bancontactAdapter = createPproAdapter({
  code: 'BANCONTACT',
  displayName: 'Bancontact',
  country: 'BE',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#005498',
  buttonLabel: 'Pay with Bancontact',
  logoUrl: '/logos/bancontact.svg',
  authType: 'REDIRECT',
});
