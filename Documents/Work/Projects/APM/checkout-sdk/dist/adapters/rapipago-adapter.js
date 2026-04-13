import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const rapipagoAdapter = createPproAdapter({
    code: 'RAPIPAGO',
    displayName: 'RapiPago',
    country: 'AR',
    currency: 'ARS',
    pattern: 'voucher-cash',
    brandColor: '#009EDB',
    buttonLabel: 'Pay with RapiPago',
    logoUrl: '/logos/rapipago.svg',
    authType: 'REDIRECT',
    voucherExpiry: '72h',
});
//# sourceMappingURL=rapipago-adapter.js.map