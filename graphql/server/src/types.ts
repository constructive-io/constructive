import type { PgpmOptions } from '@pgpmjs/types';

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
  authenticate?: string;
  authenticateStrict?: string;
  privateSchema: {
    schemaName: string;
  };
}

export interface ApiStructure {
  dbname: string;
  anonRole: string;
  roleName: string;
  schema: string[];
  apiModules: ApiModule[];
  rlsModule?: RlsModule;
  domains?: string[];
  databaseId?: string;
  isPublic?: boolean;
}

export type ApiError = { errorHtml: string };
export type ApiConfigResult = ApiStructure | ApiError | null;

export type ApiOptions = PgpmOptions & {
  api?: {
    enableServicesApi?: boolean;
    exposedSchemas?: string[];
    anonRole?: string;
    roleName?: string;
    defaultDatabaseId?: string;
    metaSchemas?: string[];
    isPublic?: boolean;
    /**
     * Admin API key for authenticating private API access.
     * When set, requests must include X-Admin-Key header with this value.
     * Should be a strong, randomly generated secret.
     */
    adminApiKey?: string;
    /**
     * List of IP addresses allowed to access private admin APIs.
     * Supports IPv4 and IPv6 addresses. IPv6 ::1 is normalized to 127.0.0.1.
     * Example: ['127.0.0.1', '10.0.0.0/8']
     */
    adminAllowedIps?: string[];
  };
};
