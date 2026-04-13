import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const multibancoAdapter = createPproAdapter({
    code: 'MULTIBANCO',
    displayName: 'Multibanco',
    country: 'PT',
    currency: 'EUR',
    pattern: 'voucher-cash',
    brandColor: '#0066CC',
    buttonLabel: 'Pay with Multibanco',
    logoUrl: '/logos/multibanco.svg',
    authType: 'REDIRECT',
    voucherExpiry: '72h',
});
//# sourceMappingURL=multibanco-adapter.js.map