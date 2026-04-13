/**
 * Adapter Registry — Plugin registration with contract version validation.
 *
 * Each adapter declares contractVersion (semver range like "^1.0.0").
 * Registry validates compatibility at registration time.
 */

import { type APMAdapter, CONTRACT_VERSION } from './types.js';

function satisfiesSemver(adapterVersion: string, registryVersion: string): boolean {
  const clean = adapterVersion.replace(/^\^/, '');
  const [aMajor] = clean.split('.').map(Number);
  const [rMajor] = registryVersion.split('.').map(Number);
  if (adapterVersion.startsWith('^')) {
    return aMajor === rMajor;
  }
  return clean === registryVersion;
}

export class AdapterRegistry {
  private adapters = new Map<string, APMAdapter>();

  register(adapter: APMAdapter): void {
    if (!adapter.id) {
      throw new Error('Adapter must have an id');
    }
    if (!adapter.contractVersion) {
      throw new Error(`Adapter ${adapter.id} must declare contractVersion`);
    }
    if (!satisfiesSemver(adapter.contractVersion, CONTRACT_VERSION)) {
      throw new Error(
        `Adapter ${adapter.id} contractVersion "${adapter.contractVersion}" ` +
        `is incompatible with registry version "${CONTRACT_VERSION}"`
      );
    }
    this.adapters.set(adapter.id.toLowerCase(), adapter);
  }

  get(id: string): APMAdapter | undefined {
    return this.adapters.get(id.toLowerCase());
  }

  has(id: string): boolean {
    return this.adapters.has(id.toLowerCase());
  }

  list(): string[] {
    return [...this.adapters.keys()];
  }

  listByPattern(pattern: string): APMAdapter[] {
    return [...this.adapters.values()].filter((a) => a.pattern === pattern);
  }

  listByRegion(region: string): APMAdapter[] {
    // Region info would come from the adapter config; for now list all
    return [...this.adapters.values()];
  }

  size(): number {
    return this.adapters.size;
  }

  clear(): void {
    this.adapters.clear();
  }
}

export const globalRegistry = new AdapterRegistry();
