/**
 * What a module reads from its siblings, and how to hand `provision_database_modules`
 * a module list that already contains them.
 *
 * Every relationship here is a mirror of a `metaschema.raise_module_required(...)`
 * call site in the SQL: that call is the module trigger or generator saying, at
 * the point it fails, which sibling plane it was reading and at which scope.
 * `__tests__/module-dependencies.test.ts` re-derives this table from those call
 * sites and fails when the two disagree, so the SQL stays the source of truth and
 * this file cannot drift into being its own invention.
 *
 * The scope is part of the dependency, not decoration: `user_auth_module` reads
 * the *app* memberships plane wherever it is installed, while `invites_module`
 * reads the memberships plane *in its own scope* — an org-scoped invites module
 * with only an app-scoped memberships plane installed is missing a dependency
 * even though `memberships_module` appears in the list.
 */

import type { BaseModuleOptions, ModuleEntry } from './types';

/**
 * Where a dependency has to be installed, relative to the module that reads it.
 *
 * - `same` — the dependent's own scope (`scope => NEW.scope` in SQL). The only
 *   direction that is ever legal implicitly: a plane is read in the scope that
 *   owns it, never borrowed from another one.
 * - `app` / `org` / `platform` — a fixed scope named by the reader itself.
 * - `unscoped` — the lookup filters on `database_id` alone, so any installed
 *   plane of that kind satisfies it.
 * - `runtime` — the scope is computed at write time from data (a policy's
 *   `membership_type`, for instance), so it cannot be closed over statically.
 *   Recorded for documentation and excluded from the closure.
 */
export type DependencyScope =
  | 'same'
  | 'app'
  | 'org'
  | 'platform'
  | 'unscoped'
  | 'runtime';

/**
 * When a dependency applies at all. A trigger that reads a sibling plane only
 * under a condition does not make that plane a dependency of every install.
 *
 * - `entity_scope` — only when the dependent is installed at a scope that names
 *   an entity (an org's own plane, a user's own plane). Decided from the entity
 *   side: `entityScopes` below lists the scopes that name an entity, rather than
 *   mirroring the generators' internal non-entity union, which is documented as
 *   a provision-time implementation detail that must not become a TS constant.
 * - `group_scope` — only when the dependent is a group plane nested under an org,
 *   which is decided from membership-type data at provision time and cannot be
 *   read off a module list. Recorded, never closed over.
 * - `{ option }` — only when that option is truthy on the dependent's entry.
 */
export type DependencyCondition =
  | 'entity_scope'
  | 'group_scope'
  | { option: string };

/** Scopes that name an entity, and so carry an owner a membership plane keys on. */
export const entityScopes = ['org', 'user'] as const;

/** One module reading one sibling plane. */
export interface ModuleDependency {
  /** Module that must be installed. */
  module: string;
  /** Where it must be installed, relative to the reader. */
  scope: DependencyScope;
  /** What the reader wants from it, in the reader's own words. */
  reason: string;
  /** Options the auto-added entry carries, beyond `scope`. */
  options?: BaseModuleOptions & Record<string, unknown>;
  /** When the dependency applies; omitted → always. */
  when?: DependencyCondition;
}

/**
 * Module → the planes its triggers and generators read.
 *
 * Keyed by module name. A generator that is not itself a module (the group
 * triggers `memberships_module` installs, the RLS parser) records its
 * dependency under the module that owns it, because that is the entry a caller
 * can act on.
 */
export const moduleDependencies: Record<string, ModuleDependency[]> = {
  billing_provider_module: [
    {
      module: 'memberships_module',
      scope: 'app',
      reason: 'the app manage_billing check its provider key reader runs',
    },
    {
      module: 'internal_secrets_module',
      scope: 'runtime',
      reason: 'the store its provider key reader reads (database scope, else app)',
    },
  ],
  capabilities_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the actor column its grants carry' },
    {
      module: 'memberships_module',
      scope: 'same',
      reason: 'the membership plane its permission bits are packed for',
    },
  ],
  connected_accounts_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the account owner' },
  ],
  crypto_addresses_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the address owner' },
  ],
  crypto_auth_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the signer it authenticates' },
    { module: 'user_state_module', scope: 'unscoped', reason: 'the state it flips on sign-in' },
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session it mints' },
    {
      module: 'crypto_addresses_module',
      scope: 'unscoped',
      reason: 'the addresses a signature is checked against',
    },
  ],
  devices_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the device owner' }],
  email_sender_module: [
    {
      module: 'internal_secrets_module',
      scope: 'runtime',
      reason: 'the database-scope credential store read when a platform email module supplies shared transport',
    },
  ],
  emails_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the address owner' }],
  events_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the event actor' }],
  hierarchy_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the actor a hierarchy edge is written by' },
    {
      module: 'memberships_module',
      scope: 'same',
      reason: 'the membership plane a hierarchy climb resolves against',
    },
  ],
  identity_providers_module: [
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session a federated sign-in mints' },
    {
      module: 'internal_secrets_module',
      scope: 'same',
      reason: 'where a provider client secret is stored',
    },
  ],
  infra_config_module: [
    {
      module: 'memberships_module',
      scope: 'same',
      when: 'entity_scope',
      reason: 'the membership plane its config policies read',
    },
    { module: 'namespace_module', scope: 'same', reason: 'the K8s namespace it deploys into' },
  ],
  infra_secrets_module: [
    {
      module: 'memberships_module',
      scope: 'same',
      when: 'entity_scope',
      reason: 'the membership plane its secret policies read',
    },
    { module: 'namespace_module', scope: 'same', reason: 'the K8s namespace it deploys into' },
  ],
  internal_config_module: [
    {
      module: 'memberships_module',
      scope: 'same',
      when: 'entity_scope',
      reason: 'the membership plane its config policies read',
    },
  ],
  internal_secrets_module: [
    {
      module: 'memberships_module',
      scope: 'same',
      when: 'entity_scope',
      reason: 'the membership plane its secret policies read',
    },
  ],
  invites_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the inviting actor' },
    {
      module: 'memberships_module',
      scope: 'same',
      reason: 'the membership plane an accepted invite writes into',
    },
    { module: 'emails_module', scope: 'unscoped', reason: 'the address an invite is sent to' },
  ],
  limits_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the actor a limit is spent by' }],
  memberships_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the member' },
    {
      module: 'membership_types_module',
      scope: 'unscoped',
      reason: 'the type a membership row carries',
    },
    {
      module: 'capabilities_module',
      scope: 'same',
      reason: 'the permission bits its grants and defaults are packed from',
    },
    {
      module: 'memberships_module',
      scope: 'org',
      when: 'group_scope',
      reason: 'the org plane a group\u2019s ancestor chain terminates at',
    },
  ],
  notifications_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the notification recipient' },
    {
      module: 'user_settings_module',
      scope: 'unscoped',
      when: { option: 'has_settings_extension' },
      reason: 'the settings table its settings extension reads',
    },
    {
      module: 'internal_secrets_module',
      scope: 'app',
      reason: 'where its delivery credentials are stored',
    },
  ],
  oauth_requests_module: [
    {
      module: 'user_auth_module',
      scope: 'unscoped',
      reason: 'the auth surface link_identity is emitted into and the sessions its step-up reads',
    },
    {
      module: 'connected_accounts_module',
      scope: 'unscoped',
      reason: 'where a redeemed link ticket binds the identity',
    },
  ],
  phone_numbers_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the number owner' }],
  // principals_module is not listed: the insert trigger provisions it.
  principal_auth_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the human behind a principal' },
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session a principal mints' },
    { module: 'user_auth_module', scope: 'unscoped', reason: 'the auth surface it extends' },
  ],
  principals_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the human behind a principal' },
    { module: 'capabilities_module', scope: 'unscoped', reason: 'the bitlen its permission masks use' },
    {
      module: 'memberships_module',
      scope: 'unscoped',
      reason: 'an sprt table to resolve a principal\u2019s bits at runtime',
    },
  ],
  profiles_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the profile subject' },
    {
      module: 'membership_types_module',
      scope: 'unscoped',
      reason: 'the type a profile is scoped by',
    },
    {
      module: 'memberships_module',
      scope: 'same',
      reason: 'the membership plane its visibility policies read',
    },
  ],
  resource_module: [
    { module: 'namespace_module', scope: 'same', reason: 'the K8s namespace it deploys into' },
  ],
  function_deployment_module: [
    { module: 'namespace_module', scope: 'same', reason: 'the K8s namespace it deploys into' },
  ],
  graph_module: [
    {
      module: 'merkle_store_module',
      scope: 'same',
      reason: 'the store its graph revisions commit into',
      options: {
        prefix: 'function_graph',
        public_schema_name: 'compute_public',
        private_schema_name: 'compute_private',
        api_name: 'compute',
        capability_key: 'manage_graphs',
      },
    },
  ],
  rls_module: [
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session its claims are read from' },
    {
      module: 'memberships_module',
      scope: 'runtime',
      reason: 'the sprt table a policy\u2019s membership_type resolves to',
    },
    {
      module: 'hierarchy_module',
      scope: 'runtime',
      reason: 'the hierarchy sprt table an org-hierarchy policy reads',
    },
  ],
  session_secrets_module: [
    { module: 'sessions_module', scope: 'unscoped', reason: 'the sessions it signs' },
  ],
  sessions_module: [{ module: 'users_module', scope: 'unscoped', reason: 'the session subject' }],
  user_auth_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the account it authenticates' },
    {
      module: 'memberships_module',
      scope: 'app',
      reason: 'the app membership a new account is granted',
    },
    { module: 'emails_module', scope: 'unscoped', reason: 'the address sign-up verifies' },
    { module: 'user_state_module', scope: 'unscoped', reason: 'the state sign-in flips' },
    {
      module: 'user_credentials_module',
      scope: 'unscoped',
      reason: 'where a password hash is stored',
    },
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session sign-in mints' },
  ],
  user_settings_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the settings owner' },
  ],
  user_settings_security_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the settings owner' },
  ],
  webauthn_auth_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the account it authenticates' },
    {
      module: 'webauthn_credentials_module',
      scope: 'unscoped',
      reason: 'the credentials an assertion is checked against',
    },
    { module: 'sessions_module', scope: 'unscoped', reason: 'the session an assertion mints' },
    { module: 'session_secrets_module', scope: 'unscoped', reason: 'the challenge signing key' },
    {
      module: 'memberships_module',
      scope: 'app',
      reason: 'the app membership whose disabled/banned standing a passkey sign-in checks',
    },
    { module: 'user_auth_module', scope: 'unscoped', reason: 'the auth surface it extends' },
  ],
  webauthn_credentials_module: [
    { module: 'users_module', scope: 'unscoped', reason: 'the credential owner' },
  ],
};

/** Options of a module entry, or `{}` for a bare name. */
function entryOptions(entry: ModuleEntry): BaseModuleOptions & Record<string, unknown> {
  return typeof entry === 'string' ? {} : ((entry[1] ?? {}) as BaseModuleOptions & Record<string, unknown>);
}

/** Name of a module entry. */
export function moduleEntryName(entry: ModuleEntry): string {
  return typeof entry === 'string' ? entry : entry[0];
}

/**
 * Does this dependency apply to this entry? An unmet condition is not a missing
 * dependency — the reader never looks the plane up.
 */
function applies(dependency: ModuleDependency, entry: ModuleEntry): boolean {
  const condition = dependency.when;
  if (condition === undefined) return true;
  if (condition === 'group_scope') return false;
  if (condition === 'entity_scope') {
    const scope = entryOptions(entry).scope as string | undefined;
    return scope !== undefined && (entityScopes as readonly string[]).includes(scope);
  }
  return Boolean(entryOptions(entry)[condition.option]);
}

/**
 * The scope a dependency has to be satisfied at, or `null` when it cannot be
 * closed over statically (`runtime`) — that dependency is a caller decision
 * driven by data, and the database raises a named error if the plane is absent.
 */
function requiredScope(
  dependency: ModuleDependency,
  dependentScope: string | undefined,
): string | undefined | null {
  switch (dependency.scope) {
  case 'runtime':
    return null;
  case 'unscoped':
    return undefined;
  case 'same':
    return dependentScope;
  default:
    return dependency.scope;
  }
}

/** Does `entries` already carry this module at this scope? */
function isSatisfied(
  entries: ModuleEntry[],
  module: string,
  scope: string | undefined,
): boolean {
  return entries.some((entry) => {
    if (moduleEntryName(entry) !== module) return false;
    // An unscoped dependency reads whichever plane exists, so any entry answers it.
    if (scope === undefined) return true;
    return entryOptions(entry).scope === scope;
  });
}

/** A dependency of a specific entry that the module list does not contain. */
export interface MissingModuleDependency {
  /** Module whose trigger or generator reads the missing plane. */
  dependent: string;
  /** Scope the dependent is installed at, when it is a scoped module. */
  dependent_scope?: string;
  /** Module that has to be installed. */
  required_module: string;
  /** Scope it has to be installed at, when the dependency is scoped. */
  required_scope?: string;
  /** What the dependent reads from it. */
  reason: string;
  /** The module list entry that satisfies it — add this verbatim. */
  declare: ModuleEntry;
}

function declarationFor(
  dependency: ModuleDependency,
  scope: string | undefined,
): ModuleEntry {
  const options = { ...(dependency.options ?? {}), ...(scope ? { scope } : {}) };
  if (Object.keys(options).length === 0) return dependency.module;
  return [dependency.module, options] as ModuleEntry;
}

/**
 * Every dependency of `modules` that `modules` does not satisfy, transitively:
 * an added plane is itself a module with dependencies, so the walk runs to a
 * fixpoint over the list as it grows.
 *
 * Nothing here crosses a database — a module list provisions one database, so
 * every dependency is resolved inside it — and nothing crosses a scope except
 * where the reader itself names the other scope (`user_auth_module` reading the
 * app membership plane, a group trigger reading the org one). A `same`-scope
 * dependency is only ever satisfied by a plane in the dependent's own scope,
 * never by one that happens to exist elsewhere.
 */
export function findMissingModuleDependencies(
  modules: ModuleEntry[],
): MissingModuleDependency[] {
  const missing: MissingModuleDependency[] = [];
  // Entries the closure has decided on so far: the caller's list plus what has
  // already been reported missing, so a plane is reported once, not once per reader.
  const known: ModuleEntry[] = [...modules];
  const pending: ModuleEntry[] = [...modules];

  while (pending.length > 0) {
    const entry = pending.shift() as ModuleEntry;
    const name = moduleEntryName(entry);
    const scope = entryOptions(entry).scope as string | undefined;

    for (const dependency of moduleDependencies[name] ?? []) {
      if (!applies(dependency, entry)) continue;
      const required = requiredScope(dependency, scope);
      if (required === null) continue;
      if (dependency.module === name && required === scope) continue;
      if (isSatisfied(known, dependency.module, required)) continue;

      const declare = declarationFor(dependency, required);
      missing.push({
        dependent: name,
        ...(scope ? { dependent_scope: scope } : {}),
        required_module: dependency.module,
        ...(required ? { required_scope: required } : {}),
        reason: dependency.reason,
        declare,
      });
      known.push(declare);
      pending.push(declare);
    }
  }

  return missing;
}

/** The same sentence the database raises, for a list that has not been provisioned yet. */
export function describeMissingModuleDependency(
  missing: MissingModuleDependency,
): string {
  const at = missing.required_scope ? ` at scope '${missing.required_scope}'` : '';
  const from = missing.dependent_scope
    ? `${missing.dependent} (scope '${missing.dependent_scope}')`
    : missing.dependent;
  return (
    `${from} reads ${missing.required_module}${at} (${missing.reason}), ` +
    `which this module list does not install — add ${JSON.stringify(missing.declare)}`
  );
}

/**
 * `modules` plus the dependency closure it is missing.
 *
 * Caller entries are returned untouched and win every conflict: a plane the
 * caller already declared keeps its prefix, storage key, schema names and
 * feature flags, and only genuinely absent planes are appended. Appending
 * rather than inserting is safe because `provision_database_modules` orders the
 * install itself by module group, not by list position.
 */
export function withRequiredModules(modules: ModuleEntry[]): ModuleEntry[] {
  return [
    ...modules,
    ...findMissingModuleDependencies(modules).map((missing) => missing.declare),
  ];
}

/**
 * Throws unless `modules` is dependency-complete, naming every missing plane and
 * the entry that satisfies it. For callers that want the list they wrote to be
 * the list that installs — a preset under test, a fixture — rather than one
 * silently grown by `withRequiredModules`.
 */
export function assertModuleDependencies(modules: ModuleEntry[]): void {
  const missing = findMissingModuleDependencies(modules);
  if (missing.length === 0) return;
  throw new Error(
    `module list is missing ${missing.length} dependenc${missing.length === 1 ? 'y' : 'ies'}:\n` +
      missing.map((m) => `  - ${describeMissingModuleDependency(m)}`).join('\n'),
  );
}
