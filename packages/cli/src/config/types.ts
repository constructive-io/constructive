/**
 * Configuration types for the CNC execution engine
 */

/**
 * Context configuration stored in ~/.cnc/config/contexts/{name}.json
 * Similar to kubectl contexts - bundles endpoint + credentials
 */
export interface ContextConfig {
  /** Context name (used as identifier) */
  name: string;
  /** GraphQL endpoint URL */
  endpoint: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Global settings stored in ~/.cnc/config/settings.json
 */
export interface GlobalSettings {
  /** Currently active context name */
  currentContext?: string;
}

/**
 * Credentials stored in ~/.cnc/config/credentials.json
 */
export interface Credentials {
  /** API tokens per context */
  tokens: Record<string, ContextCredentials>;
}

/**
 * Per-context credentials
 */
export interface ContextCredentials {
  /** Bearer token for API authentication */
  token: string;
  /** Token expiration timestamp (ISO string) */
  expiresAt?: string;
  /** Refresh token if available */
  refreshToken?: string;
}

/** Current on-disk state format. */
export const CURRENT_STATE_VERSION = 1 as const;

/**
 * Canonical CNC state. Keeping contexts, credentials, and the active selection
 * in one file lets mutations such as context deletion commit atomically.
 */
export interface CncState {
  stateVersion: typeof CURRENT_STATE_VERSION;
  settings: GlobalSettings;
  contexts: Record<string, ContextConfig>;
  credentials: Credentials;
}

/**
 * Default global settings
 */
export const DEFAULT_SETTINGS: GlobalSettings = {};

export const DEFAULT_STATE: CncState = {
  stateVersion: CURRENT_STATE_VERSION,
  settings: DEFAULT_SETTINGS,
  contexts: {},
  credentials: { tokens: {} },
};
