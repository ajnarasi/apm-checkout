/**
 * Auto-registration of all 55 APM adapters into the global registry.
 *
 * Import this file to make all adapters available via createCheckout({ apm: '...' }).
 * Adapters are registered lazily — the adapter code runs on import but SDK loading
 * only happens when init() is called.
 */
declare const allAdapters: import("./index.js").APMAdapter[];
export declare const REGISTERED_COUNT: number;
export { allAdapters };
//# sourceMappingURL=register-all.d.ts.map