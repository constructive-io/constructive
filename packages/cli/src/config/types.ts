/**
 * Configuration types for the CNC execution engine
 */

/**
 * API endpoint types for a Constructive project
 */
export type ApiType = 'public' | 'admin' | 'auth' | 'private' | 'app';

/**
 * Project configuration stored in ~/.cnc/config/projects/{name}.json
 */
export interface ProjectConfig {
  /** Project name (used as identifier) */
  name: string;
  /** Domain for the project (e.g., constructive.io) */
  domain: string;
  /** Subdomain prefix for the project */
  subdomain: string;
  /** GraphQL endpoints for each API type */
  endpoints: Record<ApiType, string>;
  /** Default API to use when not specified */
  defaultApi: ApiType;
  /** Database ID if known */
  databaseId?: string;
  /** Owner ID if known */
  ownerId?: string;
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
  /** Default domain for new projects */
  defaultDomain?: string;
  /** Whether to use HTTPS by default */
  useHttps: boolean;
  /** GraphQL path suffix (default: /graphql) */
  graphqlPath: string;
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
export const DEFAULT_SETTINGS: GlobalSettings = {
  useHttps: true,
  graphqlPath: '/graphql',
};

/**
 * Generate endpoints for a project based on domain and subdomain
 */
export function generateEndpoints(
  subdomain: string,
  domain: string,
  useHttps = true,
  graphqlPath = '/graphql'
): Record<ApiType, string> {
  const protocol = useHttps ? 'https' : 'http';
  return {
    public: `${protocol}://public-${subdomain}.${domain}${graphqlPath}`,
    admin: `${protocol}://admin-${subdomain}.${domain}${graphqlPath}`,
    auth: `${protocol}://auth-${subdomain}.${domain}${graphqlPath}`,
    private: `${protocol}://private-${subdomain}.${domain}${graphqlPath}`,
    app: `${protocol}://app-public-${subdomain}.${domain}${graphqlPath}`,
  };
}
