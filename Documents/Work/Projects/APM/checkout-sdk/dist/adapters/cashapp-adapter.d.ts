/**
 * Cash App Pay Adapter — Redirect wallet pattern
 * SDK: https://sand.kit.cash.app/web/cashapp-pay.js (sandbox)
 * Sandbox: sandbox.api.cash.app
 *
 * Magic amounts (cents): 7771=insufficient, 7772=decline, 7774=too large, 7775=too small
 * Magic grants: GRG_sandbox:active (success), GRG_sandbox:consumed/expired/revoked
 */
import { type APMAdapter } from '../core/types.js';
export declare function createCashAppAdapter(): APMAdapter;
export declare const cashappAdapter: APMAdapter;
//# sourceMappingURL=cashapp-adapter.d.ts.map