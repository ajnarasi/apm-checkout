/**
 * Klarna Payments Adapter — Server BNPL pattern
 * SDK: https://x.klarnacdn.net/kp/lib/v1/api.js
 * Global: window.Klarna.Payments
 * Sandbox: api-na.playground.klarna.com
 *
 * Test data: email=customer+us@klarna.com (approved), customer+us+denied@klarna.com (declined)
 */
import { type APMAdapter } from '../core/types.js';
declare global {
    interface Window {
        Klarna?: {
            Payments: {
                init(config: {
                    client_token: string;
                }): void;
                load(options: {
                    container: string | HTMLElement;
                    payment_method_category?: string;
                }, data: Record<string, unknown> | null, callback: (res: {
                    show_form: boolean;
                    error?: {
                        invalid_fields: string[];
                    };
                }) => void): void;
                authorize(options: {
                    payment_method_category?: string;
                    auto_finalize?: boolean;
                }, data: Record<string, unknown> | null, callback: (res: {
                    approved: boolean;
                    authorization_token?: string;
                    show_form?: boolean;
                    finalize_required?: boolean;
                    error?: {
                        invalid_fields: string[];
                    };
                }) => void): void;
                on(event: string, handler: (...args: unknown[]) => void): void;
                off(event: string, handler?: (...args: unknown[]) => void): void;
            };
        };
    }
}
export declare function createKlarnaAdapter(): APMAdapter;
export declare const klarnaAdapter: APMAdapter;
//# sourceMappingURL=klarna-adapter.d.ts.map