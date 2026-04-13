import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const ovoAdapter = createPproAdapter({
    code: 'OVO',
    displayName: 'OVO',
    country: 'ID',
    currency: 'IDR',
    pattern: 'redirect-wallet',
    brandColor: '#4C2A86',
    buttonLabel: 'Pay with OVO',
    logoUrl: '/logos/ovo.svg',
    authType: 'REDIRECT',
});
//# sourceMappingURL=ovo-adapter.js.map