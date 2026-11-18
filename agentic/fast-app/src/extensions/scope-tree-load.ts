// The live membership-scope tree of the project's database, from the modules
// API: the scopes with memberships, where storage is, and each entity type's
// table and the column that names its parent. Nothing is keyed to a
// blueprint, so a custom one reads the same way.

import { resolveProjectContext } from '@agentic-kit/db-tools/context';

import { type ScopeInfo, scopeTreeFrom } from '../app-spec/scope-tree';

const asString = (value: unknown) => (typeof value === 'string' && value ? value : null);

type ProjectContext = NonNullable<Awaited<ReturnType<typeof resolveProjectContext>>['context']>;

// Each memberships module names its entity table's owner column by field id.
async function fieldNames(context: ProjectContext, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const res = await context.api.field
    .findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    .unwrap();
  return new Map(
    (res.fields?.nodes ?? []).flatMap((node) => {
      const id = asString(node.id);
      const name = asString(node.name);
      return id && name ? [[id, name] as const] : [];
    }),
  );
}

/**
 * The project's database can't be used (gone, suspended, another account's):
 * its reason says what to do, so the caller adds no advice of its own.
 */
export class DatabaseUnusable extends Error {}

/** The tree, or null when the project has no database yet; a database that can't be read throws. */
export async function loadScopeTree(cwd: string): Promise<ScopeInfo[] | null> {
  const { context, code, reason } = await resolveProjectContext(cwd);
  if (!context) {
    // No .env, or one with no database in it: the project has none yet.
    if (code === 'no-env' || code === 'missing-credentials') return null;
    throw new DatabaseUnusable(reason || 'the project database could not be resolved');
  }
  const where = { databaseId: { equalTo: context.databaseId } };
  const [memberships, storages, entityTypes] = await Promise.all([
    context.modules.membershipsModule
      .findMany({ where, select: { scope: true, entityTableOwnerId: true } })
      .unwrap(),
    context.modules.storageModule.findMany({ where, select: { scope: true } }).unwrap(),
    context.modules.entityTypeProvision
      .findMany({
        where,
        select: {
          prefix: true,
          parentEntity: true,
          isVisible: true,
          outEntityTableName: true,
          outMembershipType: true,
        },
      })
      .unwrap(),
  ]);
  const membershipRows = memberships.membershipsModules?.nodes ?? [];
  const ownerIds = new Map(
    membershipRows.flatMap((row) => {
      const scope = asString(row.scope);
      const fieldId = asString(row.entityTableOwnerId);
      return scope && fieldId ? [[scope, fieldId] as const] : [];
    }),
  );
  const names = await fieldNames(context, [...new Set(ownerIds.values())]);
  const scopes = (rows: Array<{ scope?: unknown }> | undefined) =>
    (rows ?? []).flatMap((row) => (asString(row.scope) ? [{ scope: asString(row.scope)! }] : []));
  return scopeTreeFrom({
    memberships: scopes(membershipRows),
    storages: scopes(storages.storageModules?.nodes),
    entityTypes: (entityTypes.entityTypeProvisions?.nodes ?? []).flatMap((row) => {
      const prefix = asString(row.prefix);
      if (!prefix) return [];
      const ownerId = ownerIds.get(prefix);
      return [
        {
          prefix,
          parentEntity: asString(row.parentEntity),
          tableName: asString(row.outEntityTableName),
          isVisible: row.isVisible ?? null,
          ownerField: (ownerId && names.get(ownerId)) ?? null,
          membershipType: typeof row.outMembershipType === 'number' ? row.outMembershipType : null,
        },
      ];
    }),
  });
}
