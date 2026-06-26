import type { PgpmOptions } from '@pgpmjs/types';
import type { ApiOptions as ApiConfig } from '@constructive-io/graphql-types';

// Re-export shared types from express-context (single source of truth)
export type {
  ApiConfigResult,
  ApiError,
  ApiModule,
  ApiStructure,
  AuthSettings,
  CorsModuleData,
  DatabaseSettings,
  GenericModuleData,
  PgInterval,
  PubkeyChallengeSettings,
  PublicKeyChallengeData,
  RlsModule,
  WebauthnSettings,
} from '@constructive-io/express-context';

export type ApiOptions = PgpmOptions & { api?: ApiConfig };
