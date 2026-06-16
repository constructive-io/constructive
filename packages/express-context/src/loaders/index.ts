/**
 * Module Loaders — pluggable per-database cached lookups.
 *
 * Each loader encapsulates a SQL query + type transform + LRU cache
 * for one piece of per-database configuration. Register loaders in
 * a LoaderRegistry and pass it to createContextMiddleware().
 *
 * Built-in loaders cover the standard Constructive modules:
 *   - rlsModule       (services_public.rls_settings)
 *   - corsOrigins     (services_public.cors_settings)
 *   - databaseSettings(services_public.database_settings)
 *   - pubkeyChallengeSettings (services_public.pubkey_settings)
 *   - webauthnSettings(services_public.webauthn_settings)
 *   - authSettings    (metaschema_modules_public.sessions_module → tenant DB)
 *   - userAuthModule  (metaschema_modules_public.user_auth_module)
 *   - identityProviders (metaschema_modules_public.identity_providers_module + providers Map)
 *   - connectedAccountsModule (metaschema_modules_public.connected_accounts_module)
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
export { rlsLoader } from './rls';
export { corsLoader } from './cors';
export { databaseSettingsLoader } from './database-settings';
export { pubkeyLoader } from './pubkey';
export { webauthnLoader } from './webauthn';
export { authSettingsLoader, updateAuthSettings } from './auth-settings';
export { billingLoader } from './billing';
export { inferenceLogLoader } from './inference-log';
export { agentChatLoader } from './agent-chat';
export { userAuthModuleLoader } from './user-auth-module';
export { identityProvidersLoader } from './identity-providers';
export { connectedAccountsModuleLoader } from './connected-accounts-module';
export { llmLoader } from './llm';

/**
 * Convenience: create a registry pre-loaded with all built-in loaders.
 */
import { createLoaderRegistry } from './registry';
import { rlsLoader } from './rls';
import { corsLoader } from './cors';
import { databaseSettingsLoader } from './database-settings';
import { pubkeyLoader } from './pubkey';
import { webauthnLoader } from './webauthn';
import { authSettingsLoader } from './auth-settings';
import { billingLoader } from './billing';
import { inferenceLogLoader } from './inference-log';
import { agentChatLoader } from './agent-chat';
import { userAuthModuleLoader } from './user-auth-module';
import { identityProvidersLoader } from './identity-providers';
import { connectedAccountsModuleLoader } from './connected-accounts-module';
import { llmLoader } from './llm';

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
  registry.register(userAuthModuleLoader);
  registry.register(identityProvidersLoader);
  registry.register(connectedAccountsModuleLoader);
  registry.register(llmLoader);
  return registry;
}
