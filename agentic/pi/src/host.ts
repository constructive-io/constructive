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

/**
 * Overlay layered over the pinned base preset when provisioning a database.
 * Structurally the `ProvisionOverlay` from `provision-database/resolve`; typed
 * loosely here to keep `host.ts` free of provision-internal imports.
 */
export interface HostProvisionOverlay {
  preset?: string;
  add?: (string | [string, Record<string, unknown>])[];
  remove?: string[];
}

export interface PiToolsHost {
  /** Signed-in platform account, or null/undefined when signed out. */
  account(): HostAccount | null | undefined;
  /** Host-configured backend endpoints (env-aware). */
  backendConfig(): HostBackendConfig | null | undefined;
  /** Optional data-plane token broker (see DataAuthBroker). */
  dataAuthBroker?: DataAuthBroker;
  /**
   * Host-specific sign-in instruction, substituted into signed-out failure
   * reasons (e.g. the CLI's "Run `agent login` to sign in."). Absent hosts get
   * the desktop wording.
   */
  signInHint?: string;
  /** Harvest an end-user token from the host's app preview, if it has one. */
  previewToken?(): Promise<PreviewToken | null>;
  /** Treat tokens expiring within this window as already expired. Default 30s. */
  dataTokenSkewMs?: number;
  /**
   * Optional provision overlay: pick a base preset and/or layer module
   * add/remove on top of it. The base module list always comes from the pinned
   * `node-type-registry` preset — this only customizes it. Distributed as data
   * (e.g. materialized from appstash / a pinned git ref), never as code.
   */
  provisionOverlay?():
    | HostProvisionOverlay
    | null
    | undefined
    | Promise<HostProvisionOverlay | null | undefined>;
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
