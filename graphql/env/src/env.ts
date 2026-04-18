import type { ConstructiveOptions, OAuthProviderCredentials } from '@constructive-io/graphql-types';

/**
 * Parse GraphQL-related environment variables.
 * These are the env vars that Constructive packages need but pgpm doesn't.
 */
const parseEnvBoolean = (val?: string): boolean | undefined => {
  if (val === undefined) return undefined;
  return ['true', '1', 'yes'].includes(val.toLowerCase());
};

/**
 * @param env - Environment object to read from (defaults to process.env for backwards compatibility)
 */
export const getGraphQLEnvVars = (env: NodeJS.ProcessEnv = process.env): Partial<ConstructiveOptions> => {
  const {
    GRAPHILE_SCHEMA,

    FEATURES_SIMPLE_INFLECTION,
    FEATURES_OPPOSITE_BASE_NAMES,
    FEATURES_POSTGIS,

    API_ENABLE_SERVICES,
    API_IS_PUBLIC,
    API_EXPOSED_SCHEMAS,
    API_META_SCHEMAS,
    API_ANON_ROLE,
    API_ROLE_NAME,
    API_DEFAULT_DATABASE_ID,

    // OAuth/SSO env vars
    OAUTH_GOOGLE_CLIENT_ID,
    OAUTH_GOOGLE_CLIENT_SECRET,
    OAUTH_GITHUB_CLIENT_ID,
    OAUTH_GITHUB_CLIENT_SECRET,
    OAUTH_FACEBOOK_CLIENT_ID,
    OAUTH_FACEBOOK_CLIENT_SECRET,
    OAUTH_LINKEDIN_CLIENT_ID,
    OAUTH_LINKEDIN_CLIENT_SECRET,
    OAUTH_CALLBACK_BASE_URL,
    OAUTH_BASE_URL,
    OAUTH_SUCCESS_REDIRECT,
    OAUTH_ERROR_REDIRECT,

    // CAPTCHA env vars
    RECAPTCHA_SECRET_KEY,
  } = env;

  // Build OAuth providers from paired CLIENT_ID / CLIENT_SECRET env vars
  const oauthProviderEntries: [string, { clientId: string; clientSecret: string }][] = [
    ['google',   OAUTH_GOOGLE_CLIENT_ID,   OAUTH_GOOGLE_CLIENT_SECRET],
    ['github',   OAUTH_GITHUB_CLIENT_ID,   OAUTH_GITHUB_CLIENT_SECRET],
    ['facebook', OAUTH_FACEBOOK_CLIENT_ID, OAUTH_FACEBOOK_CLIENT_SECRET],
    ['linkedin', OAUTH_LINKEDIN_CLIENT_ID, OAUTH_LINKEDIN_CLIENT_SECRET],
  ]
    .filter((entry): entry is [string, string, string] => !!(entry[1] && entry[2]))
    .map(([name, clientId, clientSecret]) => [name, { clientId, clientSecret }] as [string, OAuthProviderCredentials]);

  const oauthProviders = oauthProviderEntries.length > 0
    ? Object.fromEntries(oauthProviderEntries)
    : undefined;

  const oauthBaseUrl = OAUTH_CALLBACK_BASE_URL || OAUTH_BASE_URL || undefined;

  return {
    graphile: {
      ...(GRAPHILE_SCHEMA && {
        schema: GRAPHILE_SCHEMA.includes(',')
          ? GRAPHILE_SCHEMA.split(',').map(s => s.trim())
          : GRAPHILE_SCHEMA
      }),
    },
    features: {
      ...(FEATURES_SIMPLE_INFLECTION && { simpleInflection: parseEnvBoolean(FEATURES_SIMPLE_INFLECTION) }),
      ...(FEATURES_OPPOSITE_BASE_NAMES && { oppositeBaseNames: parseEnvBoolean(FEATURES_OPPOSITE_BASE_NAMES) }),
      ...(FEATURES_POSTGIS && { postgis: parseEnvBoolean(FEATURES_POSTGIS) }),
    },
    api: {
      ...(API_ENABLE_SERVICES && { enableServicesApi: parseEnvBoolean(API_ENABLE_SERVICES) }),
      ...(API_IS_PUBLIC && { isPublic: parseEnvBoolean(API_IS_PUBLIC) }),
      ...(API_EXPOSED_SCHEMAS && { exposedSchemas: API_EXPOSED_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_META_SCHEMAS && { metaSchemas: API_META_SCHEMAS.split(',').map(s => s.trim()) }),
      ...(API_ANON_ROLE && { anonRole: API_ANON_ROLE }),
      ...(API_ROLE_NAME && { roleName: API_ROLE_NAME }),
      ...(API_DEFAULT_DATABASE_ID && { defaultDatabaseId: API_DEFAULT_DATABASE_ID }),
    },
    ...((oauthProviders || oauthBaseUrl || OAUTH_SUCCESS_REDIRECT || OAUTH_ERROR_REDIRECT) && {
      oauth: {
        ...(oauthProviders && { providers: oauthProviders }),
        ...(oauthBaseUrl && { baseUrl: oauthBaseUrl }),
        ...(OAUTH_SUCCESS_REDIRECT && { successRedirect: OAUTH_SUCCESS_REDIRECT }),
        ...(OAUTH_ERROR_REDIRECT && { errorRedirect: OAUTH_ERROR_REDIRECT }),
      },
    }),
    ...(RECAPTCHA_SECRET_KEY && {
      captcha: {
        recaptchaSecretKey: RECAPTCHA_SECRET_KEY,
      },
    }),
  };
};
