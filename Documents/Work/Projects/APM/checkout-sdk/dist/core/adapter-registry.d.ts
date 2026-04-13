/**
 * Adapter Registry — Plugin registration with contract version validation.
 *
 * Each adapter declares contractVersion (semver range like "^1.0.0").
 * Registry validates compatibility at registration time.
 */
import { type APMAdapter } from './types.js';
export declare class AdapterRegistry {
    private adapters;
    register(adapter: APMAdapter): void;
    get(id: string): APMAdapter | undefined;
    has(id: string): boolean;
    list(): string[];
    listByPattern(pattern: string): APMAdapter[];
    listByRegion(region: string): APMAdapter[];
    size(): number;
    clear(): void;
}
export declare const globalRegistry: AdapterRegistry;
//# sourceMappingURL=adapter-registry.d.ts.map