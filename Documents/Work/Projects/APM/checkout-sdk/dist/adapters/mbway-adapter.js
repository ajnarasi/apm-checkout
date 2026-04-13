import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const mbwayAdapter = createPproAdapter({
    code: 'MBWAY',
    displayName: 'MB WAY',
    country: 'PT',
    currency: 'EUR',
    pattern: 'redirect-wallet',
    brandColor: '#FF0000',
    buttonLabel: 'Pay with MB WAY',
    logoUrl: '/logos/mbway.svg',
    authType: 'REDIRECT',
    phoneInput: true,
});
//# sourceMappingURL=mbway-adapter.js.map