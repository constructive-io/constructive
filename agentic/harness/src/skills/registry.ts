/**
 * Minimal npm registry client for skill releases. HTTP is injectable so
 * hosts can add proxies/auth and tests can run offline.
 */

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export interface RegistryOptions {
  registryUrl?: string;
  fetchImpl?: FetchLike;
}

export interface PackumentVersion {
  version: string;
  dist: { tarball: string; integrity?: string; shasum?: string };
}

export interface Packument {
  name: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, PackumentVersion>;
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export class RegistryClient {
  private readonly registryUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: RegistryOptions = {}) {
    this.registryUrl = (options.registryUrl ?? DEFAULT_REGISTRY).replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  }

  async packument(pkg: string): Promise<Packument> {
    const url = `${this.registryUrl}/${pkg.replace('/', '%2f')}`;
    const res = await this.fetchImpl(url, {
      headers: { accept: 'application/vnd.npm.install-v1+json' },
    });
    if (!res.ok) {
      throw new Error(`Registry request failed for ${pkg}: HTTP ${res.status}`);
    }
    return (await res.json()) as Packument;
  }

  async tarball(url: string): Promise<Buffer> {
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(`Tarball download failed: HTTP ${res.status} (${url})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
