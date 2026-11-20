// `access: { scope }`: each row belongs to one entity of a membership scope,
// and only that entity's members see it. The row says which entity through one
// column, and this module finds it, so validation, the delta, the field hints
// and the rendered spec agree:
// - a workspace scope (an organization) gets `entity_id`, which the app fills
//   from the active workspace, as a curated blueprint's org tables have it;
// - an entity type uses the table's key to the type's table (a unit's
//   `property_id`), or a key to a table with the same access, whose column a
//   trigger copies (a lease takes its unit's `property_id`).

import type { ScopeInfo } from './scope-tree';
import type { ModelTable, SpecModel } from './spec-model';
import type { AccessMode, SpecBelongsTo } from './types';

/** The column a workspace-scoped row names its organization in, as curated org tables do. */
export const WORKSPACE_ENTITY_FIELD = 'entity_id';

/**
 * `membershipType`: an entity type's, which its policies name, since the
 * backend's read-only guard reads it as given. A workspace scope has none
 * here: its policies take the platform's organization default, as curated
 * blueprints leave them.
 */
export type ScopeColumn =
  | { kind: 'workspace'; scope: string; field: string }
  | { kind: 'key'; scope: string; field: string; membershipType: number }
  | {
      kind: 'inherited';
      scope: string;
      field: string;
      via: SpecBelongsTo;
      parent: string;
      membershipType?: number;
    };

/** The scope an access names; null for `shared` and `private`. */
export const scopeOfAccess = (access: AccessMode | undefined): string | null =>
  typeof access === 'object' && access ? access.scope : null;

export const sameAccess = (a: AccessMode, b: AccessMode) =>
  (scopeOfAccess(a) ?? a) === (scopeOfAccess(b) ?? b);

/** The access in words, for the plan card and messages: `shared`, `private`, `org members`. */
export const accessWords = (access: AccessMode): string =>
  scopeOfAccess(access) ? `${scopeOfAccess(access)} members` : (access as string);

/**
 * The column that names a scoped table's entity, or why it has none. `tree`
 * is the database's scopes, or the ones a first build makes.
 */
export function scopeColumn(
  model: SpecModel,
  table: ModelTable,
  tree: readonly ScopeInfo[],
  visiting: ReadonlySet<string> = new Set(),
): ScopeColumn | { problem: string } {
  const scope = scopeOfAccess(table.access);
  if (!scope) return { problem: `${table.name} has no scope access` };
  const info = tree.find((entry) => entry.scope === scope);
  const scopes = tree.filter((entry) => entry.scope !== 'app').map((entry) => `"${entry.scope}"`);
  if (!info) {
    return {
      problem: `this database has no "${scope}" scope; a scope access names ${scopes.join(', ') || 'none here'}, or a scope of the app's own, which manage_entity_types makes (describe_scopes says how)`,
    };
  }
  if (scope === 'app') {
    return { problem: 'every app member is "shared" access, not a scope' };
  }
  const declares = (field: string) => table.fields.has(field) || table.keys.has(field);
  if (info.usersTable) {
    if (declares(WORKSPACE_ENTITY_FIELD)) {
      return {
        problem: `"${WORKSPACE_ENTITY_FIELD}" names the row's organization, so ${table.name} can't declare it; give the column another name`,
      };
    }
    return { kind: 'workspace', scope, field: WORKSPACE_ENTITY_FIELD };
  }
  const membershipType = info.membershipType;
  if (membershipType == null) {
    return {
      problem: `the "${scope}" entity type isn't in the database yet; build the app, then give tables this access`,
    };
  }
  const keys = [...table.keys.values()].map(({ key }) => key);
  const direct = keys.find((key) => key.to === info.entityTable);
  if (direct) return { kind: 'key', scope, field: direct.field, membershipType };
  for (const key of keys) {
    const parent = model.tables.get(key.to);
    if (!parent || visiting.has(parent.name) || scopeOfAccess(parent.access) !== scope) continue;
    const found = scopeColumn(model, parent, tree, new Set([...visiting, table.name]));
    if ('problem' in found) continue;
    if (declares(found.field)) {
      return {
        problem: `${table.name} takes "${found.field}" from ${parent.name}, so it can't declare a column of that name`,
      };
    }
    return {
      kind: 'inherited',
      scope,
      field: found.field,
      via: key,
      parent: parent.name,
      membershipType,
    };
  }
  return {
    problem: `each ${table.name} row needs its ${scope} entity: give it a belongsTo to ${info.entityTable}, or to a table whose access is { "scope": "${scope}" }`,
  };
}

/** The scope access problems of a spec's own tables, by AppSpec path. */
export function scopeAccessErrors(
  model: SpecModel,
  tree: readonly ScopeInfo[],
): Array<{ path: string; message: string }> {
  const errors: Array<{ path: string; message: string }> = [];
  for (const table of model.tables.values()) {
    if (table.origin !== 'entity' || !scopeOfAccess(table.access)) continue;
    const found = scopeColumn(model, table, tree);
    if ('problem' in found) errors.push({ path: `${table.path}.access`, message: found.problem });
  }
  return errors;
}
