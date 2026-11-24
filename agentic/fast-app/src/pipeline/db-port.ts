// The fast app's one door to db-tools' database reads: the binding probe, the
// database check wired to the host's project records, the live schema, and
// the view sync built on them. It reaches the backend and the host, so the
// planner and its tests never load it; the tools pass what it gives them.

import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import {
  getHost,
  probeBoundDatabase,
  type ProjectContext,
  readSchemaModel,
  resolveDataToken,
} from '@agentic-kit/db-tools';
import { columnDefault, normalizeType } from '@agentic-kit/db-tools/schema-model/normalize';

import {
  type EntityTypeInput,
  type LiveModel,
  mergeLiveModel,
  type SchemaColumnInput,
  type ScopesInput,
  skewOf,
} from '../app-spec/live-model';
import { fetchLiveMeta, type LiveMetaTable } from '../extensions/db-tools/live-meta';
import { readBuildRecord } from './build-record';
import {
  type BindingProbe,
  checkDatabase,
  type CheckDeps,
  type DatabaseState,
} from './db-check';
import { getFastAppHost } from './host';
import { requireProjectContext } from './project-env';
import { readViewState, readViewText, writeView } from './view-file';
import type { SyncDeps } from './view-sync';

/** Probe a bound database with the account on the configured backend. */
export const probeBinding = (databaseId: string): Promise<BindingProbe> =>
  probeBoundDatabase(databaseId);

const checkDeps: CheckDeps = {
  project: (cwd, projectId) => {
    const { projects } = getFastAppHost();
    return (projectId ? projects.get(projectId) : undefined) ?? projects.at(cwd);
  },
  reconcile: (cwd, project) => getFastAppHost().projects.binding(cwd, project),
  probe: probeBinding,
  accountUserId: () => getHost().account()?.userId,
  saveState: async (projectId, state) =>
    getFastAppHost().projects.saveDatabaseState?.(projectId, state),
  notify: (project) => getFastAppHost().events?.projectUpdated(project),
  forgetPasswords: async (projectId) => getFastAppHost().passwords?.forgetProject(projectId),
  now: () => Date.now(),
};

/** checkDatabase with the host's project records, the account and the backend. */
export const checkProjectDatabase = (cwd: string, projectId?: string): Promise<DatabaseState> =>
  checkDatabase(cwd, projectId, checkDeps);

// `_meta`'s table and column names, so a later read can tell whether the API changed.
function metaDigestOf(tables: readonly LiveMetaTable[]): string {
  const names = tables.flatMap((t) => [
    t.name,
    ...(t.fields ?? []).map((f) => `${t.name}.${f.name}`),
  ]);
  return createHash('sha256').update(names.sort().join('\n')).digest('hex').slice(0, 16);
}

// `_meta` answers without a token on current backends; a data token only
// widens what it shows. Null when it can't be read: the model then has
// metaschema's values alone.
async function readMeta(context: ProjectContext): Promise<LiveMetaTable[] | null> {
  if (!context.dataEndpoint) return null;
  const token = await resolveDataToken(context).catch((): { token?: string } => ({ token: undefined }));
  return fetchLiveMeta(context.dataEndpoint, token.token).catch((): null => null);
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const flag = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

/**
 * The database's membership scopes: each entity type with its table's columns
 * (the app schema model leaves that core table out), and each scope's
 * membership lookup table, which an entity membership policy names. A failed
 * read throws: without it, an entity type's table reads as an app table.
 */
async function readScopes(context: ProjectContext): Promise<ScopesInput> {
  const where = { databaseId: { equalTo: context.databaseId } };
  const [memberships, types] = await Promise.all([
    context.modules.membershipsModule
      .findMany({ where, select: { scope: true, sprtTableId: true } })
      .unwrap(),
    context.modules.entityTypeProvision
      .findMany({
        where,
        select: {
          name: true,
          prefix: true,
          description: true,
          parentEntity: true,
          isVisible: true,
          hasInvites: true,
          hasProfiles: true,
          hasLimits: true,
          hasLevels: true,
          storage: true,
          outEntityTableId: true,
          outEntityTableName: true,
          outMembershipType: true,
        },
      })
      .unwrap(),
  ]);
  const scopes = (memberships.membershipsModules?.nodes ?? []).flatMap((row) => {
    const scope = text(row.scope);
    const sprt = text(row.sprtTableId);
    return scope && sprt ? [{ scope, sprt }] : [];
  });
  const typeRows = (types.entityTypeProvisions?.nodes ?? []).filter(
    (row) => text(row.prefix) && text(row.outEntityTableId) && text(row.outEntityTableName),
  );
  const [sprtTables, fields] = await Promise.all([
    scopes.length
      ? context.api.table
        .findMany({
          where: { id: { in: scopes.map((s) => s.sprt) } },
          select: { id: true, name: true },
        })
        .unwrap()
      : null,
    typeRows.length
      ? context.api.field
        .findMany({
          where: { tableId: { in: typeRows.map((row) => row.outEntityTableId as string) } },
          select: {
            id: true,
            tableId: true,
            name: true,
            fieldOrder: true,
            type: true,
            isRequired: true,
            defaultValue: true,
          },
        })
        .unwrap()
      : null,
  ]);
  const tableName = new Map(
    (sprtTables?.tables?.nodes ?? []).map((row) => [text(row.id), text(row.name)] as const),
  );
  // As db-tools reads an app table's columns: one type name, a comparable default.
  const columns = new Map<string, SchemaColumnInput[]>();
  for (const row of fields?.fields?.nodes ?? []) {
    const id = text(row.id);
    const tableId = text(row.tableId);
    const name = text(row.name);
    if (!id || !tableId || !name) continue;
    const column: SchemaColumnInput = {
      id,
      name,
      ...(typeof row.fieldOrder === 'number' && { order: row.fieldOrder }),
      type: normalizeType(row.type),
      isRequired: Boolean(row.isRequired),
      default: columnDefault(row.defaultValue),
    };
    columns.set(tableId, [...(columns.get(tableId) ?? []), column]);
  }
  return {
    sprtTables: Object.fromEntries(
      scopes.flatMap(({ scope, sprt }) => {
        const name = tableName.get(sprt);
        return name ? [[name, scope] as const] : [];
      }),
    ),
    entityTypes: typeRows.map(
      (row): EntityTypeInput => ({
        tableId: row.outEntityTableId as string,
        table: row.outEntityTableName as string,
        columns: columns.get(row.outEntityTableId as string) ?? [],
        definition: {
          name: text(row.name) ?? (row.prefix as string),
          prefix: row.prefix as string,
          ...(text(row.description) && { description: text(row.description) }),
          ...(text(row.parentEntity) && { parentEntity: text(row.parentEntity) }),
          ...(flag(row.isVisible) !== undefined && { isVisible: flag(row.isVisible) }),
          ...(flag(row.hasInvites) !== undefined && { hasInvites: flag(row.hasInvites) }),
          ...(flag(row.hasProfiles) !== undefined && { hasProfiles: flag(row.hasProfiles) }),
          ...(flag(row.hasLimits) !== undefined && { hasLimits: flag(row.hasLimits) }),
          ...(flag(row.hasLevels) !== undefined && { hasLevels: flag(row.hasLevels) }),
          ...(row.storage != null && { storage: row.storage }),
          ...(typeof row.outMembershipType === 'number' && {
            membershipType: row.outMembershipType,
          }),
        },
      }),
    ),
  };
}

// `_meta` shows a schema change about 2 s after metaschema does, so a column
// only `_meta` lists may just have been dropped by the schema tools.
const META_LAG_MS = 3_000;

const skewed = (model: LiveModel) => skewOf(model).metaOnly.size > 0;

/**
 * The project's database as plan_app reads it: metaschema's APP tables merged
 * with `_meta`. When `_meta` lists a column metaschema doesn't, `_meta` is read
 * once more after its usual lag before the column counts as added with SQL. Right
 * after the app's own schema change `_meta` always lags, so `recheckSkew:
 * false` skips that wait where a later step waits for `_meta` anyway.
 */
export async function readLiveModel(
  cwd: string,
  { recheckSkew = true }: { recheckSkew?: boolean } = {},
): Promise<LiveModel> {
  const context = await requireProjectContext(cwd);
  const [schema, meta, scopes] = await Promise.all([
    readSchemaModel(context),
    readMeta(context),
    readScopes(context),
  ]);
  const merge = (tables: LiveMetaTable[] | null) =>
    mergeLiveModel({
      databaseId: context.databaseId,
      hash: schema.hash ?? context.hash ?? null,
      schema,
      meta: tables,
      metaDigest: tables ? metaDigestOf(tables) : null,
      scopes,
    });
  const model = merge(meta);
  if (!recheckSkew || !skewed(model)) return model;
  await delay(META_LAG_MS);
  const again = await readMeta(context);
  return again ? merge(again) : model;
}

/** syncView with the desktop's database check, the live schema and the project's files. */
export const liveDeps: SyncDeps = {
  check: checkProjectDatabase,
  readModel: (cwd) => readLiveModel(cwd),
  readRecord: readBuildRecord,
  readState: readViewState,
  readViewText,
  writeView,
};
