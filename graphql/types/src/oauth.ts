/**
 * GraphQL-server-owned OAuth runtime options.
 *
 * Provider endpoints, credentials, scopes, and policy remain Tenant data and
 * are deliberately absent from this process-level configuration surface.
 */
export interface OAuthServerOptions {
  /** Explicitly enables the unified-auth Provider flow. */
  enabled?: boolean;
  /** Maximum duration of one outbound Provider HTTP request. */
  providerRequestTimeoutMs?: number;
}

export const oauthServerDefaults: Required<OAuthServerOptions> = {
  enabled: false,
  providerRequestTimeoutMs: 10_000
};
