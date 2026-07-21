/**
 * @constructive-io/express-context
 *
 * Extractable Express middleware for Constructive tenant context.
 *
 * Provides:
 *   - Shared types (ApiStructure, RlsModule, AuthSettings, etc.)
 *   - pgSettings builder (role, JWT claims, request_id, database_id)
 *   - withPgClient (tenant-scoped RLS transaction helper)
 *   - requestId middleware (UUID correlation ID)
 *   - Context middleware (composes all of the above into req.constructive)
 *   - Module loaders (pluggable per-database cached lookups)
 *
 * @example
 * ```typescript
 * import {
 *   createContextMiddleware,
 *   requestIdMiddleware,
 *   createDefaultRegistry,
 * } from '@constructive-io/express-context';
 *
 * const loaders = createDefaultRegistry();
 *
 * app.use(requestIdMiddleware());
 * app.use(apiMiddleware);        // sets req.api (your domain resolver)
 * app.use(authMiddleware);       // sets req.token (your JWT verifier)
 * app.use(createContextMiddleware({ loaders })); // builds req.constructive
 *
 * app.post('/v1/chat', async (req, res) => {
 *   const ctx = req.constructive;
 *   const rls = await ctx.useModule('rlsModule');       // only fires if not cached
 *   const auth = await ctx.useModule('authSettings');    // only fires if not cached
 *   // webauthnSettings loader never fires if nobody asks for it
 * });
 * ```
 */

// Types
export type {
  AgentChatConfig,
  ApiConfigResult,
  ApiError,
  ApiModule,
  ApiStructure,
  AuthSettings,
  BillingConfig,
  BuiltinModuleMap,
  ConnectedAccountsModuleConfig,
  ComputeConfig,
  ComputeModuleConfig,
  ConstructiveAPIToken,
  ConstructiveContext,
  CorsModuleData,
  DatabaseSettings,
  GenericModuleData,
  IdentityProviderConfigMap,
  IdentityProviderFullConfig,
  IdentityProvidersConfig,
  InferenceLogConfig,
  PgInterval,
  LlmConfig,
  PublicKeyChallengeData,
  PubkeyChallengeSettings,
  RlsModule,
  UserAuthModuleConfig,
  WebauthnSettings,
  WithPgClient,
} from './types';

// Billing client
export type { BillingClient, InferenceLogEntry } from './billing-client';
export { createBillingClient } from './billing-client';

// pgSettings builder
export type { PgSettingsInput } from './pg-settings';
export { buildPgSettings } from './pg-settings';

// withPgClient helper
export { withPgClient } from './pg-client';

// Request ID middleware
export { requestIdMiddleware } from './request-id';

// Context middleware
export type { ContextMiddlewareOptions } from './context';
export { buildContext, createContextMiddleware } from './context';

// Module loaders
export type {
  CreateLoaderOptions,
  LoaderContext,
  LoaderRegistry,
  ModuleLoader,
} from './loaders';
export {
  agentChatLoader,
  authSettingsLoader,
  billingLoader,
  connectedAccountsModuleLoader,
  computeLoader,
  corsLoader,
  createDefaultRegistry,
  createLoaderRegistry,
  createModuleLoader,
  databaseSettingsLoader,
  identityProvidersLoader,
  inferenceLogLoader,
  pubkeyLoader,
  rlsLoader,
  userAuthModuleLoader,
  llmLoader,
  webauthnLoader,
} from './loaders';

// Side-effect: Express type augmentation
import './types';
