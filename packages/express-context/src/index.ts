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
 *   - Module loaders (pluggable authoritative or hard-TTL lookups)
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
 *   const rls = await ctx.useModule('rlsModule');        // authoritative read
 *   const auth = await ctx.useModule('authSettings');    // authoritative read
 *   // webauthnSettings loader never fires if nobody asks for it
 * });
 * ```
 */

// Types
export type {
  AgentChatConfig,
  ApiConfigResult,
  ApiError,
  ApiStructure,
  AuthSettings,
  AuthSurface,
  BillingConfig,
  BuiltinModuleMap,
  ComputeBindingConfig,
  ComputeConfig,
  ComputeModuleConfig,
  ConstructiveAPIToken,
  ConstructiveContext,
  DatabaseSettings,
  IdentityProviderConfig,
  IdentityProvidersModule,
  InferenceLogConfig,
  LlmConfig,
  PubkeyChallengeSettings,
  RlsModule,
  StorageConfig,
  StorageModuleConfig,
  WebauthnSettings,
  WithPgClient,
} from './types';

// Billing client
export type { BillingClient, InferenceLogEntry } from './billing-client';
export { createBillingClient } from './billing-client';

// pgSettings builder
export type { PgSettingsInput, SecurityGucKey } from './pg-settings';
export { buildPgSettings, SECURITY_GUC_KEYS } from './pg-settings';

// Safe interpolation for trusted metadata identifiers. Request values still
// belong in query parameters.
export {
  quoteQualifiedSqlIdentifier,
  quoteSqlIdentifier
} from './sql-identifiers';

// withPgClient helper
export { withPgClient } from './pg-client';

// Request ID middleware
export { requestIdMiddleware } from './request-id';

// Context middleware
export type {
  ContextMiddlewareOptions,
  RuntimePgPoolResolution
} from './context';
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
  authSurfaceLoader,
  billingLoader,
  computeLoader,
  corsLoader,
  createDefaultRegistry,
  createLoaderRegistry,
  createModuleLoader,
  databaseSettingsLoader,
  identityProvidersLoader,
  inferenceLogLoader,
  llmLoader,
  pubkeyLoader,
  requireDatabaseId,
  requireIdentityProvider,
  rlsLoader,
  storageLoader,
  webauthnLoader,
} from './loaders';

// Side-effect: Express type augmentation
import './types';
