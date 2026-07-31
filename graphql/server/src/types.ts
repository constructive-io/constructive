import type { ApiOptions as ApiConfig } from '@constructive-io/graphql-types';
import type { PgpmOptions } from '@pgpmjs/types';

// Re-export shared types from express-context (single source of truth)
export type {
  ApiConfigResult,
  ApiError,
  ApiStructure,
  AuthSettings,
  DatabaseSettings,
  PubkeyChallengeSettings,
  RlsModule,
  WebauthnSettings,
} from '@constructive-io/express-context';

export type ApiOptions = PgpmOptions & { api?: ApiConfig };
