/**
 * `pgpm import` driver: pgpm-itize an arbitrary SQL dump.
 *
 * A preprocessed dump (`DumpSource`) is classified statement-by-statement,
 * dump noise is filtered, riders (grants/comments/ownership) are re-attached
 * to their host objects, and the result is routed through the shared dials
 * pipeline (`restructureExportRows`): spec-derived change paths
 * (`identityOf` + `pathFor`, collisions via `alterationPathFor`),
 * graph-derived `requires`, generated revert/verify.
 *
 * Dump-specific handling:
 * - `SET ...` / `SELECT set_config(...)` preamble statements are skipped;
 * - `CREATE EXTENSION` statements become `.control` requires (pgpm owns
 *   extension creation at deploy time);
 * - `COPY ... FROM stdin` blocks and `INSERT`s are skipped by default with a
 *   warning; `withData` emits them as seed fixture changes (COPY data is
 *   converted to INSERTs so it deploys through the pg driver);
 * - statements that classify to no object and attach to no host (roles,
 *   default privileges, ...) land in a `misc/statements` change, first in
 *   the plan, with a warning — never dropped silently.
 */
import { PgpmRow } from '@pgpmjs/core';
import { ObjectIdentity, pathFor, PathStyle } from '@pgpmjs/naming-spec';
import { classifyStatements, loadModule, regenerateScripts, StatementFacts } from '@pgpmjs/transform';

import { copyBlockToInsert, copyTargetOf, DumpSource } from './dump-source';
import { ExportGranularity, restructureExportRows } from './restructure';

export const MISC_CHANGE_PATH = 'misc/statements';

export interface ImportDumpRowsOptions {
  /** Granularity dial (default: `object`). */
  granularity?: ExportGranularity;
  /** Naming spec path style (default: `directory`). */
  naming?: PathStyle;
  /** Emit data statements (COPY blocks, INSERTs) as seed fixture changes. */
  withData?: boolean;
}

export interface ImportDumpSummary {
  /** Total statements seen (parsed statements + COPY data blocks). */
  statements: number;
  /** Changes emitted. */
  changes: number;
  /** Preamble statements skipped (SET / set_config / psql meta-commands). */
  skippedPreamble: number;
  /** Data statements skipped (only when `withData` is off). */
  skippedData: number;
  /** Statements placed in the misc/ change. */
  misc: number;
}

export interface ImportDumpRowsResult {
  /** Changes in deploy order, ready for plan/file emission. */
  rows: PgpmRow[];
  /** Extension names from `CREATE EXTENSION`, for the module's `.control`. */
  controlRequires: string[];
  warnings: string[];
  summary: ImportDumpSummary;
}

type NameParts = string[];

const stringVal = (node: any): string | null =>
  typeof node?.String?.sval === 'string' ? node.String.sval : null;

const namesOf = (nodes: any[] | undefined): NameParts =>
  (nodes ?? []).map(stringVal).filter((s): s is string => s !== null);

const hostKey = (schema: string | null, name: string): string => `${schema ?? ''}.${name}`;

const keyOfParts = (parts: NameParts): string | null => {
  if (parts.length === 0) return null;
  if (parts.length === 1) return hostKey(null, parts[0]);
  return hostKey(parts[0], parts[1]);
};

/** Comment object types whose name parts end with a sub-object segment. */
const COMMENT_SUBOBJECT_TYPES = new Set([
  'OBJECT_COLUMN',
  'OBJECT_TRIGGER',
  'OBJECT_POLICY',
  'OBJECT_RULE',
  'OBJECT_TABCONSTRAINT'
]);

/** Resolve the host object a COMMENT statement targets. */
const commentHostOf = (stmt: Record<string, any>): string | null => {
  const comment = stmt.CommentStmt;
  if (!comment) return null;
  const { objtype, object } = comment;
  if (!object) return null;

  if (object.String) return hostKey(null, object.String.sval);
  if (object.TypeName) return keyOfParts(namesOf(object.TypeName.names));
  if (object.ObjectWithArgs) return keyOfParts(namesOf(object.ObjectWithArgs.objname));
  if (object.List) {
    let parts = namesOf(object.List.items);
    if (COMMENT_SUBOBJECT_TYPES.has(objtype)) parts = parts.slice(0, -1);
    return keyOfParts(parts);
  }
  return null;
};

/** Resolve the host object a GRANT/REVOKE statement targets. */
const grantHostOf = (stmt: Record<string, any>): string | null => {
  const grant = stmt.GrantStmt;
  if (!grant?.objects?.length) return null;
  const first = grant.objects[0];
  if (first.String) return hostKey(null, first.String.sval);
  if (first.RangeVar) {
    return hostKey(first.RangeVar.schemaname ?? null, first.RangeVar.relname);
  }
  if (first.ObjectWithArgs) return keyOfParts(namesOf(first.ObjectWithArgs.objname));
  return null;
};

/** The host object a rider statement (no creates) attaches to, if resolvable. */
const riderHostOf = (facts: StatementFacts): string | null => {
  if (facts.references.length > 0) {
    const ref = facts.references[0];
    return hostKey(ref.schema, ref.name);
  }
  if (!facts.stmt) return null;
  if (facts.nodeTag === 'CommentStmt') return commentHostOf(facts.stmt);
  if (facts.nodeTag === 'GrantStmt') return grantHostOf(facts.stmt);
  return null;
};

const SET_CONFIG = /^SELECT\s+(pg_catalog\.)?set_config\s*\(/i;

const isPreamble = (facts: StatementFacts, text: string): boolean =>
  facts.nodeTag === 'VariableSetStmt' ||
  (facts.nodeTag === 'SelectStmt' && SET_CONFIG.test(text));

const statementText = (sql: string, facts: StatementFacts): string => {
  const text = sql.slice(facts.span.start, facts.span.start + facts.span.len).trim();
  return text.endsWith(';') ? text : `${text};`;
};

interface DataUnit {
  key: string;
  identity: ObjectIdentity;
  sql: string;
}

const seedVerify = (schema: string | null, name: string): string => {
  const target = schema ? `${schema}.${name}` : name;
  return [
    'DO $$ BEGIN',
    `  IF NOT EXISTS (SELECT 1 FROM ${target}) THEN`,
    `    RAISE EXCEPTION 'no seed rows in ${target}';`,
    '  END IF;',
    'END $$;'
  ].join('\n');
};

const seedRevert = (schema: string | null, name: string): string => {
  const target = schema ? `${schema}.${name}` : name;
  return `DELETE FROM ${target};`;
};

/**
 * Classify a preprocessed dump and restructure it into pgpm change rows at
 * the requested granularity. Requires nothing beyond the `DumpSource` —
 * `loadModule()` is awaited internally.
 */
export const importDumpRows = async (
  source: DumpSource,
  options: ImportDumpRowsOptions = {}
): Promise<ImportDumpRowsResult> => {
  await loadModule();

  const granularity = options.granularity ?? 'object';
  const style = options.naming ?? 'directory';
  const withData = options.withData ?? false;

  const warnings: string[] = [...source.warnings];
  const controlRequires: string[] = [];
  const miscTexts: string[] = [];
  const dataUnits: DataUnit[] = [];

  let skippedPreamble = source.metaCommands.length;
  let skippedData = 0;

  const facts = classifyStatements(source.sql);

  // Main statements (those creating/targeting an object) in dump order, with
  // per-statement rider buckets so riders re-attach right after their host.
  const mainTexts: string[] = [];
  const riderBuckets: string[][] = [];
  const lastIndexOfKey = new Map<string, number>();

  interface PendingRider {
    text: string;
    host: string;
    nodeTag: string;
  }
  const pendingRiders: PendingRider[] = [];

  for (const f of facts) {
    const text = statementText(source.sql, f);

    if (isPreamble(f, text)) {
      skippedPreamble++;
      continue;
    }

    if (f.kind === 'extension' && f.extension?.action === 'create') {
      if (!controlRequires.includes(f.extension.name)) {
        controlRequires.push(f.extension.name);
      }
      continue;
    }

    if (f.kind === 'seed_dml') {
      const target = f.creates[0];
      if (!withData) {
        skippedData++;
        continue;
      }
      dataUnits.push({
        key: hostKey(target?.schema ?? null, target?.name ?? 'unknown'),
        identity: {
          kind: 'seed_dml',
          schema: target?.schema ?? null,
          name: 'seed',
          table: target?.name ?? 'unknown'
        },
        sql: text
      });
      continue;
    }

    if (f.creates.length > 0) {
      const index = mainTexts.length;
      mainTexts.push(text);
      riderBuckets.push([]);
      for (const created of f.creates) {
        lastIndexOfKey.set(hostKey(created.schema, created.name), index);
      }
      continue;
    }

    const host = riderHostOf(f);
    if (host !== null) {
      pendingRiders.push({ text, host, nodeTag: f.nodeTag });
      continue;
    }

    miscTexts.push(text);
    warnings.push(`unclassifiable statement (${f.nodeTag}) placed in ${MISC_CHANGE_PATH}: ${text.split('\n')[0]}`);
  }

  for (const rider of pendingRiders) {
    const index = lastIndexOfKey.get(rider.host);
    if (index !== undefined) {
      riderBuckets[index].push(rider.text);
    } else {
      miscTexts.push(rider.text);
      warnings.push(`${rider.nodeTag} targets an object not created in this dump — placed in ${MISC_CHANGE_PATH}: ${rider.text.split('\n')[0]}`);
    }
  }

  // COPY data blocks (extracted pre-parse) become seed data too.
  for (const block of source.copyBlocks) {
    if (!withData) {
      skippedData++;
      continue;
    }
    const insert = copyBlockToInsert(block);
    if (!insert) continue;
    const target = copyTargetOf(block);
    dataUnits.push({
      key: hostKey(target.schema, target.name),
      identity: { kind: 'seed_dml', schema: target.schema, name: 'seed', table: target.name },
      sql: insert
    });
  }

  if (!withData && skippedData > 0) {
    warnings.push(`${skippedData} data statement(s) skipped (pass --with-data to import them as seed fixtures)`);
  }

  // Reassemble the program with riders adjacent to their hosts, and
  // restructure through the shared dials pipeline.
  const program = mainTexts
    .flatMap((text, i) => [text, ...riderBuckets[i]])
    .join('\n\n');

  const restructured = await restructureExportRows(
    program.trim()
      ? [{ name: 'import/dump', deploy: 'import/dump', deps: [], content: program }]
      : [],
    granularity,
    { naming: style }
  );
  warnings.push(...restructured.warnings);

  const rows: PgpmRow[] = [];

  if (miscTexts.length > 0) {
    const miscSql = miscTexts.join('\n\n');
    const scripts = regenerateScripts(miscSql);
    warnings.push(...scripts.revert.warnings.map(w => `${MISC_CHANGE_PATH}: ${w}`));
    warnings.push(...scripts.verify.warnings.map(w => `${MISC_CHANGE_PATH}: ${w}`));
    rows.push({
      name: MISC_CHANGE_PATH,
      deploy: MISC_CHANGE_PATH,
      deps: [],
      content: miscSql,
      revert: scripts.revert.sql,
      verify: scripts.verify.sql
    });
  }

  rows.push(...restructured.rows);

  // Seed fixture changes, one per table, after the schema changes.
  const seedsByTable = new Map<string, DataUnit[]>();
  for (const unit of dataUnits) {
    const existing = seedsByTable.get(unit.key);
    if (existing) existing.push(unit);
    else seedsByTable.set(unit.key, [unit]);
  }
  const taken = new Set(rows.map(row => row.deploy));
  for (const units of seedsByTable.values()) {
    const { identity } = units[0];
    let deploy = pathFor(identity, { style });
    while (taken.has(deploy)) deploy = `${deploy}_`;
    taken.add(deploy);
    const tablePath = pathFor(
      { kind: 'table', schema: identity.schema, name: identity.table! },
      { style }
    );
    rows.push({
      name: deploy,
      deploy,
      deps: rows.some(row => row.deploy === tablePath) ? [tablePath] : [],
      content: units.map(unit => unit.sql).join('\n\n'),
      revert: seedRevert(identity.schema, identity.table!),
      verify: seedVerify(identity.schema, identity.table!)
    });
  }

  return {
    rows,
    controlRequires,
    warnings,
    summary: {
      statements: facts.length + source.copyBlocks.length + source.metaCommands.length,
      changes: rows.length,
      skippedPreamble,
      skippedData: withData ? 0 : skippedData,
      misc: miscTexts.length
    }
  };
};
