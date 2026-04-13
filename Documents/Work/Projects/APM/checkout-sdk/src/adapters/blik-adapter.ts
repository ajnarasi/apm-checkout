import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const blikAdapter = createPproAdapter({
  code: 'BLIK',
  displayName: 'BLIK',
  country: 'PL',
  currency: 'PLN',
  pattern: 'bank-redirect',
  brandColor: '#000000',
  buttonLabel: 'Pay with BLIK',
  logoUrl: '/logos/blik.svg',
  authType: 'REDIRECT',
  inputField: { type: 'numeric', maxLength: 6, placeholder: 'Enter 6-digit BLIK code' },});
