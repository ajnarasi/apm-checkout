import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const upiAdapter = createPproAdapter({
    code: 'UPI',
    displayName: 'UPI',
    country: 'IN',
    currency: 'INR',
    pattern: 'qr-code',
    brandColor: '#5F259F',
    buttonLabel: 'Pay with UPI',
    logoUrl: '/logos/upi.svg',
    authType: 'SCAN_CODE',
    pollInterval: 3000, pollMaxDuration: 600000,
});
//# sourceMappingURL=upi-adapter.js.map