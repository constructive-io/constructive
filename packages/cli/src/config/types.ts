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

/**
 * Default global settings
 */
export const DEFAULT_SETTINGS: GlobalSettings = {};
