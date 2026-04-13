import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const pixAdapter = createPproAdapter({
    code: 'PIX',
    displayName: 'Pix',
    country: 'BR',
    currency: 'BRL',
    pattern: 'qr-code',
    brandColor: '#32BCAD',
    buttonLabel: 'Pay with Pix',
    logoUrl: '/logos/pix.svg',
    authType: 'SCAN_CODE',
    pollInterval: 3000, pollMaxDuration: 3600000,
});
//# sourceMappingURL=pix-adapter.js.map