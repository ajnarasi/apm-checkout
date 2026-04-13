import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const konbiniAdapter = createPproAdapter({
    code: 'KONBINI',
    displayName: 'Konbini',
    country: 'JP',
    currency: 'JPY',
    pattern: 'voucher-cash',
    brandColor: '#FF6600',
    buttonLabel: 'Pay at Konbini',
    logoUrl: '/logos/konbini.svg',
    authType: 'REDIRECT',
    voucherExpiry: '3d', storeSelection: true,
});
//# sourceMappingURL=konbini-adapter.js.map