/**
 * Configuration types for the CNC execution engine
 */

/**
 * Project configuration stored in ~/.cnc/config/projects/{name}.json
 */
export interface ProjectConfig {
  /** Project name (used as identifier) */
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
  /** Currently active project name */
  currentProject?: string;
}

/**
 * Credentials stored in ~/.cnc/config/credentials.json
 */
export interface Credentials {
  /** API tokens per project */
  tokens: Record<string, ProjectCredentials>;
}

/**
 * Per-project credentials
 */
export interface ProjectCredentials {
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
