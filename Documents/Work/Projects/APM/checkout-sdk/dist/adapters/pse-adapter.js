import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const pseAdapter = createPproAdapter({
    code: 'PSE',
    displayName: 'PSE',
    country: 'CO',
    currency: 'COP',
    pattern: 'bank-redirect',
    brandColor: '#005BAA',
    buttonLabel: 'Pay with PSE',
    logoUrl: '/logos/pse.svg',
    authType: 'REDIRECT',
    bankSelection: true, supportedBanks: ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogota', 'Nequi'],
});
//# sourceMappingURL=pse-adapter.js.map