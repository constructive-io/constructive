export interface IdentityProviderConfiguration {
  slug: string;
  kind: string;
  displayName: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
  issuerUrl: string | null;
  discoveryDoc: Record<string, unknown> | null;
  jwks: Record<string, unknown> | null;
  acceptableClientIds: string[];
  scopes: string[];
  extraAuthorizationParams: Record<string, string>;
  emailOptional: boolean;
  skipNonceCheck: boolean;
  pkceEnabled: boolean;
}

declare const validatedEndpoint: unique symbol;

/** An HTTPS endpoint that has passed a concrete adapter's exact allowlist. */
export type ValidatedEndpoint = string & {
  readonly [validatedEndpoint]: true;
};

export interface ValidatedProviderConfiguration {
  adapterKind: string;
  providerKey: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: ValidatedEndpoint;
  tokenEndpoint: ValidatedEndpoint;
  scopes: readonly string[];
  extraAuthorizationParams: Readonly<Record<string, string>>;
}

export interface ProviderAuthorizationInput<
  C extends ValidatedProviderConfiguration = ValidatedProviderConfiguration
> {
  config: C;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  nonce?: string;
}

export interface ProviderAuthorizationResult {
  url: string;
}

export interface ProviderCallbackInput<
  C extends ValidatedProviderConfiguration = ValidatedProviderConfiguration
> {
  config: C;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  nonce?: string;
  requestTimeoutMs: number;
  fetch?: typeof fetch;
}

export interface SafeExternalProfile {
  name?: string;
  username?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

/** The only Provider result consumed by common Constructive orchestration. */
export interface NormalizedExternalIdentity {
  providerKey: string;
  subject: string;
  email?: string;
  profile: SafeExternalProfile;
}

export type ProviderFailureReason =
  | 'INVALID_CONFIGURATION'
  | 'INVALID_AUTHORIZATION_INPUT'
  | 'NETWORK_FAILURE'
  | 'REQUEST_TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'IDENTITY_VERIFICATION_FAILED';

/**
 * Package-local failure classification. Transport owners map it to canonical
 * Constructive errors and never expose Provider response bodies.
 */
export class ProviderAdapterError extends Error {
  readonly reason: ProviderFailureReason;
  readonly status?: number;

  constructor(
    reason: ProviderFailureReason,
    message: string,
    options?: ErrorOptions & { status?: number }
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ProviderAdapterError';
    this.reason = reason;
    this.status = options?.status;
  }
}
