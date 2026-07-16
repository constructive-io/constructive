import type { ApiOptions as ApiConfig, RoutingOptions } from '@constructive-io/graphql-types';
import type { PgpmOptions } from '@pgpmjs/types';

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
  PubkeyChallengeSettings,
  PublicKeyChallengeData,
  RlsModule,
  WebauthnSettings
} from '@constructive-io/express-context';

export type ApiOptions = PgpmOptions & { api?: ApiConfig; routing?: RoutingOptions };
