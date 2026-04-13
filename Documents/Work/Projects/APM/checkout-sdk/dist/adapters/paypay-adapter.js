import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const paypayAdapter = createPproAdapter({
    code: 'PAYPAY',
    displayName: 'PayPay',
    country: 'JP',
    currency: 'JPY',
    pattern: 'qr-code',
    brandColor: '#FF0033',
    buttonLabel: 'Pay with PayPay',
    logoUrl: '/logos/paypay.svg',
    authType: 'SCAN_CODE',
    dualMode: true,
});
//# sourceMappingURL=paypay-adapter.js.map