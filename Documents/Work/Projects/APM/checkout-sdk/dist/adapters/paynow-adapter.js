import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const paynowAdapter = createPproAdapter({
    code: 'PAYNOW',
    displayName: 'PayNow',
    country: 'SG',
    currency: 'SGD',
    pattern: 'bank-redirect',
    brandColor: '#7B2D8E',
    buttonLabel: 'Pay with PayNow',
    logoUrl: '/logos/paynow.svg',
    authType: 'REDIRECT',
});
//# sourceMappingURL=paynow-adapter.js.map