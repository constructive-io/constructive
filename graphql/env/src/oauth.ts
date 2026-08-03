import type { ConstructiveOptions } from '@constructive-io/graphql-types';
import {
  cleanEnv,
  devDefault,
  getNodeEnv,
  makeValidator,
  required,
  withDefault
} from '12factor-env';

export const DEV_OAUTH_STATE_SECRET =
  'development-only-oauth-state-secret-change-me';

const oauthStateSecret = makeValidator<string>((value) => {
  if (value.length === 0 || value.trim() !== value) {
    throw new Error('must be non-blank and contain no surrounding whitespace');
  }
  if (Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error('must contain at least 32 UTF-8 bytes');
  }
  return value;
});

const strictBoolean = makeValidator<boolean>((value) => {
  const raw = value as unknown;
  if (raw === true || raw === false) return raw;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('must be exactly "true" or "false"');
});

export const parseOAuthEnabled = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined;
  return cleanEnv(
    { OAUTH_ENABLED: value },
    { OAUTH_ENABLED: strictBoolean() }
  ).OAUTH_ENABLED;
};

/**
 * Validate OAuth only after defaults, config, env, and runtime overrides have
 * been merged. This lets the highest-priority runtime layer satisfy production
 * requirements without coupling the OAuth package itself to process.env.
 */
export const validateOAuthOptions = (
  options: ConstructiveOptions,
  environment: NodeJS.ProcessEnv = process.env
): ConstructiveOptions => {
  const enabled = cleanEnv(
    {
      ...environment,
      OAUTH_ENABLED:
        options.oauth?.enabled === undefined
          ? undefined
          : String(options.oauth.enabled)
    },
    { OAUTH_ENABLED: withDefault(strictBoolean, false) }
  ).OAUTH_ENABLED;

  if (!enabled) {
    return {
      ...options,
      oauth: {
        ...options.oauth,
        enabled: false
      }
    };
  }

  const stateSecretSpec =
    getNodeEnv(environment) === 'production'
      ? required(oauthStateSecret)
      : devDefault(oauthStateSecret, DEV_OAUTH_STATE_SECRET);
  const stateSecret = cleanEnv(
    {
      ...environment,
      OAUTH_STATE_SECRET: options.oauth?.stateSecret
    },
    { OAUTH_STATE_SECRET: stateSecretSpec }
  ).OAUTH_STATE_SECRET;

  return {
    ...options,
    oauth: {
      ...options.oauth,
      enabled: true,
      stateSecret
    }
  };
};
