import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const webpayAdapter = createPproAdapter({
    code: 'WEBPAY',
    displayName: 'Webpay',
    country: 'CL',
    currency: 'CLP',
    pattern: 'bank-redirect',
    brandColor: '#FF0000',
    buttonLabel: 'Pay with Webpay',
    logoUrl: '/logos/webpay.svg',
    authType: 'REDIRECT',
});
//# sourceMappingURL=webpay-adapter.js.map