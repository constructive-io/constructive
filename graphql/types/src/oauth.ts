export interface OAuthServerOptions {
  /** Explicit server feature flag. Disabled servers do not mount browser routes. */
  enabled?: boolean;
  /** Platform-level HMAC secret. Tenant provider secrets do not belong here. */
  stateSecret?: string;
  /** Lifetime of a signed authorization receipt, in milliseconds. */
  stateMaxAgeMs?: number;
  /** Same-origin frontend destination after a successful callback. */
  successPath?: string;
  /** Same-origin frontend destination for callback failures. */
  failurePath?: string;
  /** Validated deployment fallback for transient OAuth cookies. */
  cookieSecure?: boolean;
}

export const oauthServerDefaults: Required<
  Omit<OAuthServerOptions, 'stateSecret'>
> = {
  enabled: false,
  stateMaxAgeMs: 10 * 60 * 1000,
  successPath: '/',
  failurePath: '/',
  cookieSecure: false,
};
