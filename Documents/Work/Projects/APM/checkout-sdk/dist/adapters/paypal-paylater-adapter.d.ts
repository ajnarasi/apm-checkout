/**
 * PayPal Pay Later Adapter — Server BNPL pattern
 * SDK: https://www.paypal.com/sdk/js?client-id=sb&enable-funding=paylater&components=buttons,messages
 * Button: paypal.FUNDING.PAYLATER funding source
 * Sandbox: client-id=sb (no signup needed)
 *
 * Pay Later lets customers pay in 4 installments or get monthly financing.
 * Promotional messaging shows "Pay in 4" or "Pay Monthly" based on amount.
 */
import { type APMAdapter } from '../core/types.js';
export declare function createPaypalPaylaterAdapter(): APMAdapter;
export declare const paypalPaylaterAdapter: APMAdapter;
//# sourceMappingURL=paypal-paylater-adapter.d.ts.map