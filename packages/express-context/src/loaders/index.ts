/**
 * Module Loaders — pluggable per-database cached lookups.
 *
 * Each loader encapsulates a SQL query + type transform + LRU cache
 * for one piece of per-database configuration. Register loaders in
 * a LoaderRegistry and pass it to createContextMiddleware().
 *
 * Built-in loaders cover the standard Constructive modules:
 *   - rlsModule       (routing-plane rls_settings)
 *   - corsOrigins     (routing-plane cors_settings)
 *   - databaseSettings(routing-plane database_settings)
 *   - pubkeyChallengeSettings (routing-plane pubkey_settings)
 *   - webauthnSettings(routing-plane webauthn_settings)
 *   - authSettings    (metaschema_modules_public.sessions_module → tenant DB)
 *   - encryptedSecrets (constructive_store_private.platform_secrets)
 *   - userAuth        (metaschema_modules_public.user_auth_module)
 *   - identityProviders (metaschema_modules_public.identity_providers_module + providers Map)
 *   - connectedAccounts (metaschema_modules_public.connected_accounts_module)
 *
 * To add a new per-db lookup, implement a ModuleLoader and register it:
 *
 *   const myLoader = createModuleLoader({
 *     name: 'myModule',
 *     ttlMs: 60_000,
 *     async resolve(ctx) {
 *       const { rows } = await ctx.tenantPool.query(MY_SQL, [ctx.databaseId]);
 *       return rows[0] ? transform(rows[0]) : undefined;
 *     },
 *   });
 *   registry.register(myLoader);
 */

// Core types
export type { LoaderContext, ModuleLoader } from './types';

// Factory
export type { CreateLoaderOptions } from './create-loader';
export { createModuleLoader } from './create-loader';

// Registry
export type { LoaderRegistry } from './registry';
export { createLoaderRegistry } from './registry';

// Built-in loaders
export { agentChatLoader } from './agent-chat';
export { authSettingsLoader } from './auth-settings';
export { billingLoader } from './billing';
export { computeLoader } from './compute';
export { connectedAccountsLoader } from './connected-accounts';
export { corsLoader } from './cors';
export { databaseSettingsLoader } from './database-settings';
export { encryptedSecretsLoader } from './encrypted-secrets';
export { identityProvidersLoader } from './identity-providers';
export { inferenceLogLoader } from './inference-log';
export { llmLoader } from './llm';
export { pubkeyLoader } from './pubkey';
export { rlsLoader } from './rls';
export { userAuthLoader } from './user-auth';
export { webauthnLoader } from './webauthn';

/**
 * Convenience: create a registry pre-loaded with all built-in loaders.
 */
import { agentChatLoader } from './agent-chat';
import { authSettingsLoader } from './auth-settings';
import { billingLoader } from './billing';
import { computeLoader } from './compute';
import { connectedAccountsLoader } from './connected-accounts';
import { corsLoader } from './cors';
import { databaseSettingsLoader } from './database-settings';
import { encryptedSecretsLoader } from './encrypted-secrets';
import { identityProvidersLoader } from './identity-providers';
import { inferenceLogLoader } from './inference-log';
import { llmLoader } from './llm';
import { pubkeyLoader } from './pubkey';
import { createLoaderRegistry } from './registry';
import { rlsLoader } from './rls';
import { userAuthLoader } from './user-auth';
import { webauthnLoader } from './webauthn';

export function createDefaultRegistry() {
  const registry = createLoaderRegistry();
  registry.register(rlsLoader);
  registry.register(corsLoader);
  registry.register(databaseSettingsLoader);
  registry.register(pubkeyLoader);
  registry.register(webauthnLoader);
  registry.register(authSettingsLoader);
  registry.register(billingLoader);
  registry.register(inferenceLogLoader);
  registry.register(agentChatLoader);
  registry.register(llmLoader);
  registry.register(computeLoader);
  registry.register(encryptedSecretsLoader);
  registry.register(userAuthLoader);
  registry.register(identityProvidersLoader);
  registry.register(connectedAccountsLoader);
  return registry;
}
