import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const przelewy24Adapter = createPproAdapter({
  code: 'PRZELEWY24',
  displayName: 'Przelewy24',
  country: 'PL',
  currency: 'PLN',
  pattern: 'bank-redirect',
  brandColor: '#D13239',
  buttonLabel: 'Pay with Przelewy24',
  logoUrl: '/logos/przelewy24.svg',
  authType: 'REDIRECT',
  bankSelection: true, supportedBanks: ['mBank', 'PKO BP', 'ING', 'Santander', 'Pekao', 'Alior', 'BNP Paribas', 'Credit Agricole', 'Millennium'],});
