import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const epsAdapter = createPproAdapter({
  code: 'EPS',
  displayName: 'EPS',
  country: 'AT',
  currency: 'EUR',
  pattern: 'bank-redirect',
  brandColor: '#C8192E',
  buttonLabel: 'Pay with EPS',
  logoUrl: '/logos/eps.svg',
  authType: 'REDIRECT',
  bankSelection: true, supportedBanks: ['Erste Bank', 'Raiffeisen', 'Bank Austria', 'BAWAG', 'Volksbank', 'Hypo'],});
