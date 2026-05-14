import type { PgpmOptions } from '@pgpmjs/types';
import type { ApiOptions as ApiConfig } from '@constructive-io/graphql-types';

export interface CorsModuleData {
  urls: string[];
}

export interface PublicKeyChallengeData {
  schema: string;
  crypto_network: string;
  sign_up_with_key: string;
  sign_in_request_challenge: string;
  sign_in_record_failure: string;
  sign_in_with_challenge: string;
}

export interface GenericModuleData {
  [key: string]: unknown;
}

/**
 * Resolved feature flags from database_settings + api_settings cascade.
 * api_settings values (when non-null) override database_settings defaults.
 */
export interface DatabaseSettings {
  enableAggregates: boolean;
  enablePostgis: boolean;
  enableSearch: boolean;
  enableDirectUploads: boolean;
  enablePresignedUploads: boolean;
  enableManyToMany: boolean;
  enableConnectionFilter: boolean;
  enableLtree: boolean;
  enableLlm: boolean;
  enableRealtime: boolean;
  enableBulk: boolean;
}

/**
 * Resolved pubkey challenge config from pubkey_settings typed table.
 * Matches the shape expected by the PublicKeySignature Graphile plugin.
 */
export interface PubkeyChallengeSettings {
  schema: string;
  cryptoNetwork: string;
  signUpWithKey: string;
  signInRequestChallenge: string;
  signInRecordFailure: string;
  signInWithChallenge: string;
}

/**
 * Resolved WebAuthn config from webauthn_settings typed table.
 * Stored on ApiStructure for future server-side WebAuthn wiring.
 */
export interface WebauthnSettings {
  schema: string;
  credentialsSchema: string;
  sessionsSchema: string;
  sessionSecretsSchema: string;
  rpId: string;
  rpName: string;
  originAllowlist: string[];
  attestationType: string;
  requireUserVerification: boolean;
  residentKey: string;
  challengeExpirySeconds: number;
}

export type ApiModule =
  | { name: 'cors'; data: CorsModuleData }
  | { name: 'pubkey_challenge'; data: PublicKeyChallengeData }
  | { name: string; data?: GenericModuleData };

export interface RlsModule {
  authenticate: string;
  authenticateStrict: string;
  privateSchema: {
    schemaName: string;
  };
  publicSchema: {
    schemaName: string;
  };
  currentRole: string;
  currentRoleId: string;
  currentIpAddress: string;
  currentUserAgent: string;
}

/**
 * Server-visible subset of app_auth_settings (lives in the tenant DB private schema).
 * Discovered dynamically via metaschema_modules_public.sessions_module.
 * Loaded once per API resolution and cached alongside the ApiStructure.
 */
export interface AuthSettings {
  /** Cookie configuration */
  cookieSecure?: boolean;
  cookieSamesite?: string;
  cookieDomain?: string | null;
  cookieHttponly?: boolean;
  cookieMaxAge?: string | null;
  cookiePath?: string;
  /** Remember me duration (seconds) for extended session cookies */
  rememberMeDuration?: string | null;
  /** reCAPTCHA / CAPTCHA */
  enableCaptcha?: boolean;
  captchaSiteKey?: string | null;
}

export interface ApiStructure {
  apiId?: string;
  dbname: string;
  anonRole: string;
  roleName: string;
  schema: string[];
  apiModules: ApiModule[];
  rlsModule?: RlsModule;
  domains?: string[];
  databaseId?: string;
  isPublic?: boolean;
  authSettings?: AuthSettings;
  corsOrigins?: string[];
  databaseSettings?: DatabaseSettings;
  pubkeyChallengeSettings?: PubkeyChallengeSettings;
  webauthnSettings?: WebauthnSettings;
}

export type ApiError = { errorHtml: string };
export type ApiConfigResult = ApiStructure | ApiError | null;

export type ApiOptions = PgpmOptions & { api?: ApiConfig };
