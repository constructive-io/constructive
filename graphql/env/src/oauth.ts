import {
  oauthServerDefaults,
  type OAuthServerOptions
} from '@constructive-io/graphql-types';
import { bool, env as validateEnv, EnvError, num } from '12factor-env';

export const OAUTH_PROVIDER_REQUEST_TIMEOUT_MAX_MS = 60_000;

const assertProviderRequestTimeout = (value: unknown): number => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > OAUTH_PROVIDER_REQUEST_TIMEOUT_MAX_MS
  ) {
    throw new EnvError(
      `oauth.providerRequestTimeoutMs must be an integer between 1 and ${OAUTH_PROVIDER_REQUEST_TIMEOUT_MAX_MS}`
    );
  }
  return value;
};

/** Parse only explicitly supplied OAuth environment overrides. */
export const getOAuthEnvVars = (
  input: NodeJS.ProcessEnv
): OAuthServerOptions | undefined => {
  const overrides: OAuthServerOptions = {};
  let configured = false;

  if (input.OAUTH_ENABLED !== undefined) {
    const parsed = validateEnv(
      { OAUTH_ENABLED: input.OAUTH_ENABLED },
      {},
      { OAUTH_ENABLED: bool() }
    );
    overrides.enabled = parsed.OAUTH_ENABLED;
    configured = true;
  }

  if (input.OAUTH_PROVIDER_REQUEST_TIMEOUT_MS !== undefined) {
    const parsed = validateEnv(
      {
        OAUTH_PROVIDER_REQUEST_TIMEOUT_MS:
          input.OAUTH_PROVIDER_REQUEST_TIMEOUT_MS
      },
      {},
      { OAUTH_PROVIDER_REQUEST_TIMEOUT_MS: num() }
    );
    overrides.providerRequestTimeoutMs = assertProviderRequestTimeout(
      parsed.OAUTH_PROVIDER_REQUEST_TIMEOUT_MS
    );
    configured = true;
  }

  return configured ? overrides : undefined;
};

/** Validate and complete the effective OAuth options after all merge layers. */
export const validateOAuthServerOptions = (
  input: OAuthServerOptions | undefined
): Required<OAuthServerOptions> => {
  const enabled = input?.enabled ?? oauthServerDefaults.enabled;
  if (typeof enabled !== 'boolean') {
    throw new EnvError('oauth.enabled must be a boolean');
  }

  return {
    enabled,
    providerRequestTimeoutMs: assertProviderRequestTimeout(
      input?.providerRequestTimeoutMs ??
        oauthServerDefaults.providerRequestTimeoutMs
    )
  };
};
