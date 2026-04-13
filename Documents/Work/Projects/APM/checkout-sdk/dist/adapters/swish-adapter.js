import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const swishAdapter = createPproAdapter({
    code: 'SWISH',
    displayName: 'Swish',
    country: 'SE',
    currency: 'SEK',
    pattern: 'redirect-wallet',
    brandColor: '#F8B71C',
    buttonLabel: 'Pay with Swish',
    logoUrl: '/logos/swish.svg',
    authType: 'REDIRECT',
    dualMode: true,
});
//# sourceMappingURL=swish-adapter.js.map