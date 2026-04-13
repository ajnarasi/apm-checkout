/**
 * Zepto Adapter — Bank Redirect pattern (PayTo / NPP)
 * API: https://api.sandbox.zeptopayments.com
 * Auth: OAuth 2.0
 * Region: Australia (AUD)
 *
 * Zepto provides account-to-account payments via Australia's NPP (New Payments Platform).
 * Supports PayTo agreements, PayID, direct debit, and real-time NPP payouts.
 * Amount format: integer cents (MULTIPLY_100).
 */
import { type APMAdapter } from '../core/types.js';
export declare function createZeptoAdapter(): APMAdapter;
export declare const zeptoAdapter: APMAdapter;
//# sourceMappingURL=zepto-adapter.d.ts.map