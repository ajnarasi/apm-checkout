import { createPproAdapter } from '../core/ppro-adapter-factory.js';
export const pagoefectivoAdapter = createPproAdapter({
    code: 'PAGOEFECTIVO',
    displayName: 'PagoEfectivo',
    country: 'PE',
    currency: 'PEN',
    pattern: 'voucher-cash',
    brandColor: '#FFCC00',
    buttonLabel: 'Pay with PagoEfectivo',
    logoUrl: '/logos/pagoefectivo.svg',
    authType: 'REDIRECT',
    voucherExpiry: '48h',
});
//# sourceMappingURL=pagoefectivo-adapter.js.map