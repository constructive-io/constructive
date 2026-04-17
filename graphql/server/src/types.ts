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
 * Loaded once per API resolution and cached alongside the ApiStructure.
 */
export interface AuthSettings {
  /** CORS allowed origins from app_auth_settings.allowed_origins */
  allowedOrigins?: string[] | null;
  /** Cookie configuration */
  cookieSecure?: boolean;
  cookieSamesite?: string;
  cookieDomain?: string | null;
  cookieHttponly?: boolean;
  cookieMaxAge?: string | null;
  cookiePath?: string;
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
}

export type ApiError = { errorHtml: string };
export type ApiConfigResult = ApiStructure | ApiError | null;

export type ApiOptions = PgpmOptions & { api?: ApiConfig };
