import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const shopeepayAdapter = createPproAdapter({
    code: 'SHOPEEPAY',
    displayName: 'ShopeePay',
    country: 'ID',
    currency: 'IDR',
    pattern: 'redirect-wallet',
    brandColor: '#EE4D2D',
    buttonLabel: 'Pay with ShopeePay',
    logoUrl: '/logos/shopeepay.svg',
    authType: 'REDIRECT',
});
//# sourceMappingURL=shopeepay-adapter.js.map