import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const idealAdapter = createPproAdapter({
    code: 'IDEAL',
    displayName: 'iDEAL',
    country: 'NL',
    currency: 'EUR',
    pattern: 'bank-redirect',
    brandColor: '#CC0066',
    buttonLabel: 'Pay with iDEAL',
    logoUrl: '/logos/ideal.svg',
    authType: 'REDIRECT',
    bankSelection: true, supportedBanks: ['ABN AMRO', 'ING', 'Rabobank', 'SNS', 'ASN', 'Triodos', 'Knab', 'Bunq', 'N26'],
});
//# sourceMappingURL=ideal-adapter.js.map