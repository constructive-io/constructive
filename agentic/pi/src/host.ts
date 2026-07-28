/**
 * Host contract for the pi-hosted Constructive tools.
 *
 * The typed db tools were extracted from Constructive Desktop, where they read
 * an Electron-side `runtime` singleton (account store, backend config, data-auth
 * broker, preview token). Hosts now inject the same surface here once at
 * startup (`configureHost`); the tool modules stay module-level `ToolDefinition`
 * consts and read it lazily via `getHost()`.
 */

export type HostAccount = {
  userId: string;
  accessToken: string;
  apiKey?: string;
};

export type HostBackendConfig = {
  apiEndpoint?: string;
  modulesEndpoint?: string;
};

export type ActiveDataToken = {
  token: string;
  userId?: string;
  expiresAt: number;
  origin?: string;
};

/**
 * Optional data-plane token broker: remembers per-database end-user tokens
 * across tool calls and invalidates declined/expired ones. Hosts without a
 * broker fall back to the preview-token harvest on every call.
 */
export interface DataAuthBroker {
  getActiveToken(databaseId: string): ActiveDataToken | undefined | null;
  isInvalidToken(databaseId: string, token: string): boolean;
  adoptToken(databaseId: string, token: ActiveDataToken): void;
}

/** Token harvested from the host's app preview (end-user sign-in). */
export type PreviewToken = {
  accessToken: string;
  accessTokenExpiresAt?: string;
  userId?: string;
};

export interface PiToolsHost {
  /** Signed-in platform account, or null/undefined when signed out. */
  account(): HostAccount | null | undefined;
  /** Host-configured backend endpoints (env-aware). */
  backendConfig(): HostBackendConfig | null | undefined;
  /** Optional data-plane token broker (see DataAuthBroker). */
  dataAuthBroker?: DataAuthBroker;
  /** Harvest an end-user token from the host's app preview, if it has one. */
  previewToken?(): Promise<PreviewToken | null>;
  /** Treat tokens expiring within this window as already expired. Default 30s. */
  dataTokenSkewMs?: number;
}

export const DEFAULT_DATA_TOKEN_SKEW_MS = 30_000;

let currentHost: PiToolsHost | null = null;

export function configureHost(host: PiToolsHost): void {
  currentHost = host;
}

export function getHost(): PiToolsHost {
  if (!currentHost) {
    throw new Error(
      '@agentic-kit/pi host not configured. Call configureHost() (or createDbTools(host)) before using the db tools.'
    );
  }
  return currentHost;
}
