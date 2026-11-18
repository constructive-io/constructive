// plan_app's scope tree: the live one once the project has a database, else
// the one the first build's blueprint will make. The AppSpec's opt-in scope
// screens are checked against it, and its entity types hint their owner keys.

import type { AppSpec, AppSpecError } from '../app-spec';
import { scopeOfDefault } from '../app-spec/contract/app-spec.types';
import { scopeAccessErrors, scopeOfAccess } from '../app-spec/scope-access';
import {
  plannedScopeTree,
  scopeFeatureErrors,
  type ScopeInfo,
  withPlannedScopes,
} from '../app-spec/scope-tree';
import type { SpecModel } from '../app-spec/spec-model';
import { CURATED_BLUEPRINTS } from '../blueprints/curated';
import { loadScopeTree } from '../extensions/scope-tree-load';
import type { DatabaseState } from '../pipeline/db-check';

const entitiesOf = (spec: AppSpec) =>
  spec.backend.kind === 'custom' ? spec.backend.entities : (spec.backend.extend?.entities ?? []);

const usesScopes = (spec: AppSpec) =>
  entitiesOf(spec).some((entity) => scopeOfAccess(entity.access)) ||
  Boolean(spec.ui?.workspace) ||
  Boolean(spec.ui?.access?.length) ||
  Object.values(spec.ui?.resources ?? {}).some(
    (resource) =>
      resource.panels ||
      Object.values(resource.fields ?? {}).some((hint) => scopeOfDefault(hint.default)),
  );

/** The tree the spec's blueprint will make; the built-in scopes alone for a custom spec. */
export const plannedTreeOf = (spec: AppSpec): ScopeInfo[] =>
  plannedScopeTree(
    spec.backend.kind === 'blueprint' ? CURATED_BLUEPRINTS[spec.backend.slug] : undefined,
  );

/**
 * The database's tree, or the planned one while the project has no database.
 * A bound database's tree that can't be read stops plan_app like a database
 * it can't check: the planned tree would refuse a custom spec's entity types
 * and leave out their owner hints.
 */
export type SpecScopeTree =
  | { kind: 'read'; tree: ScopeInfo[] }
  | Extract<DatabaseState, { kind: 'unreachable' }>;

export async function specScopeTree(
  cwd: string,
  spec: AppSpec,
  /** `empty`: a database with no app tables yet, so the next build is a first build. */
  database: 'none' | 'empty' | 'built',
): Promise<SpecScopeTree> {
  if (database === 'none') return { kind: 'read', tree: plannedTreeOf(spec) };
  try {
    const live = await loadScopeTree(cwd);
    if (!live) return { kind: 'read', tree: plannedTreeOf(spec) };
    // A first build's blueprint adds its entity types after this check.
    const tree = database === 'empty' ? withPlannedScopes(live, plannedTreeOf(spec)) : live;
    return { kind: 'read', tree };
  } catch (err) {
    const detail = `reading the membership scopes failed: ${err instanceof Error ? err.message : String(err)}`;
    return { kind: 'unreachable', cause: 'error', detail };
  }
}

export function specScopeErrors(
  spec: AppSpec,
  model: SpecModel,
  tree: readonly ScopeInfo[],
): AppSpecError[] {
  return usesScopes(spec)
    ? [...scopeFeatureErrors(spec, tree), ...scopeAccessErrors(model, tree)]
    : [];
}
