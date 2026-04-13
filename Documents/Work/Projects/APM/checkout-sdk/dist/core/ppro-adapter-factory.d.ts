/**
 * PPRO Adapter Factory — Creates APM adapters for all PPRO-routed payment methods.
 *
 * 39 APMs share the same PPRO payment-charges API but differ in:
 * - paymentMethod code, country, currency
 * - Auth type (REDIRECT vs SCAN_CODE)
 * - UI (button label, brand color, logo)
 * - Special inputs (bank selection, BLIK code, MB Way phone)
 * - Voucher expiry (Boleto 7d, OXXO 72h, etc.)
 * - Dual-mode QR/redirect (Swish, Alipay, PayPay)
 */
import { type APMAdapter, type PproAdapterConfig } from './types.js';
export declare function createPproAdapter(config: PproAdapterConfig): APMAdapter;
//# sourceMappingURL=ppro-adapter-factory.d.ts.map