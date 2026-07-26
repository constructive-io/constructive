/**
 * Generic, deterministic table-data export.
 *
 * Emits INSERT/DELETE/verify SQL for a set of tables so callers can ship row
 * data inside a pgpm change (replayed under `session_replication_role =
 * replica`). This is the shared data-dump capability behind the meta export
 * flow and downstream scoped-plane data exports — column introspection,
 * non-deterministic-default exclusion, and script assembly live here so
 * consumers do not re-implement them.
 *
 * All emitted SQL is built through @constructive-io/query-builder (pg-ast +
 * pgsql-deparser) — no string concatenation, no manual identifier quoting.
 */
import {
  cast,
  col,
  div,
  eq,
  fn,
  gte,
  lit,
  QueryBuilder
} from '@constructive-io/query-builder';

/**
 * Minimal query interface satisfied by pg.Pool, pg.Client, and test clients.
 */
export interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

export interface DataExportColumn {
  /** Column name. */
  name: string;
  /** Fully formatted SQL type (format_type), used for value casts. */
  type: string;
  /** The column's default expression, if any (pg_get_expr). */
  columnDefault: string | null;
  /**
   * True when the default expression depends on a non-immutable function
   * (now(), CURRENT_TIMESTAMP, clock_timestamp(), gen_random_uuid(), ...).
   * Detected from the compiled default expression's function references
   * (pg_proc.provolatile), not by pattern-matching the expression text.
   */
  volatileDefault: boolean;
}

/**
 * Introspect the exportable columns of a table: name, formatted type,
 * default expression, and whether that default depends on a non-immutable
 * function. Single canonical column introspection for data exports.
 */
export const getDataExportColumns = async (
  db: Queryable,
  schema: string,
  table: string
): Promise<DataExportColumn[]> => {
  const result = await db.query(
    `
      SELECT a.attname AS name,
             format_type(a.atttypid, a.atttypmod) AS type,
             pg_get_expr(d.adbin, d.adrelid) AS column_default,
             COALESCE((
               SELECT bool_or(p.provolatile <> 'i')
               FROM regexp_matches(d.adbin::text, ':funcid (\\d+)', 'g') m
               JOIN pg_proc p ON p.oid = m[1]::oid
             ), d.adbin::text ~ 'SQLVALUEFUNCTION', false) AS volatile_default
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
      WHERE n.nspname = $1 AND c.relname = $2
        AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum
    `,
    [schema, table]
  );

  return result.rows.map((row: any) => ({
    name: row.name,
    type: row.type,
    columnDefault: row.column_default,
    volatileDefault: row.volatile_default
  }));
};

/**
 * True for columns whose value must be omitted from exported rows so the DDL
 * DEFAULT re-supplies it at deploy time: timestamp/timestamptz columns whose
 * default depends on a non-immutable function (wall-clock defaults).
 */
export const isVolatileTimestampColumn = (column: DataExportColumn): boolean =>
  column.volatileDefault && /^timestamp/.test(column.type);

/**
 * A column described by metadata (its name, SQL type, and default expression
 * text) rather than by a live physical table. Fed to getMetadataExportColumns
 * so metadata-only planes (tables that exist as schema metadata but are not
 * physically deployed at export time) get the same volatility classification
 * as physical tables.
 */
export interface MetadataExportColumn {
  /** Column name. */
  name: string;
  /** SQL type, e.g. 'timestamptz', 'text', 'uuid' — must resolve in the DB. */
  type: string;
  /** The column's default expression text, if any (e.g. 'now()'). */
  columnDefault: string | null;
}

/**
 * Classify columns described by metadata instead of a live physical table.
 *
 * Metadata-only planes describe their tables as schema metadata but are not
 * physically deployed when the export runs, so pg_attrdef-based introspection
 * cannot see them. This builds an ephemeral temp table from the supplied
 * descriptions and runs the exact same provolatile-based classification that
 * getDataExportColumns uses for physical tables — one shared code path — so
 * volatile-default detection (isVolatileTimestampColumn, etc.) behaves
 * identically for both.
 *
 * Results preserve the input order and names. Each column's type must be a
 * type resolvable in the connected database; each non-null default must be a
 * valid default expression for that type. `db` must be a single session
 * (client), not a pool: the classification runs inside a transaction (or a
 * savepoint when the caller is already in one) that is always rolled back, so
 * the temp table never survives — not even on failure — and nothing is ever
 * committed.
 */
export const getMetadataExportColumns = async (
  db: Queryable,
  columns: MetadataExportColumn[]
): Promise<DataExportColumn[]> => {
  if (columns.length === 0) return [];

  const tempTable = 'pgpm_metadata_export_columns';
  // Synthetic column identifiers keep the DDL immune to reserved words and
  // duplicate names; results map back to the caller's columns by ordinal.
  const columnDefs = columns
    .map((c, i) => {
      const def =
        c.columnDefault != null && c.columnDefault !== ''
          ? ` DEFAULT ${c.columnDefault}`
          : '';
      return `c${i} ${c.type}${def}`;
    })
    .join(', ');

  // Savepoint when already inside a caller transaction, otherwise our own
  // transaction. Either way the work is rolled back below, so the temp table
  // name is deterministic and can never collide or leak.
  let usedSavepoint = true;
  try {
    await db.query(`SAVEPOINT ${tempTable}`);
  } catch (_e) {
    usedSavepoint = false;
    await db.query('BEGIN');
  }
  try {
    await db.query(`CREATE TEMP TABLE ${tempTable} (${columnDefs})`);
    const tempSchemaRes = await db.query(
      `SELECT nspname FROM pg_namespace WHERE oid = pg_my_temp_schema()`
    );
    const tempSchema = tempSchemaRes.rows[0]?.nspname as string;
    const introspected = await getDataExportColumns(db, tempSchema, tempTable);

    // getDataExportColumns orders by attnum, matching the c0..cN creation
    // order, so results align with the input columns by index.
    return columns.map((c, i) => {
      const found = introspected[i];
      return {
        name: c.name,
        type: found ? found.type : c.type,
        columnDefault: c.columnDefault ?? null,
        volatileDefault: found ? found.volatileDefault : false
      };
    });
  } finally {
    if (usedSavepoint) {
      await db.query(`ROLLBACK TO SAVEPOINT ${tempTable}`);
      await db.query(`RELEASE SAVEPOINT ${tempTable}`);
    } else {
      await db.query('ROLLBACK');
    }
  }
};

export interface DataExportTableSpec {
  schema: string;
  table: string;
  /** Optional equality filter, e.g. { column: 'database_id', value: id }. */
  filter?: { column: string; value: string };
}

export interface ExportTableDataOptions {
  /**
   * Columns excluded from the export in addition to volatile timestamp
   * defaults (e.g. environment-stamped columns like dbname, or trigger
   * maintained stamps like created_at/updated_at).
   */
  excludeColumns?: string[];
  /** Emit ON CONFLICT DO NOTHING on the INSERT. */
  conflictDoNothing?: boolean;
}

export interface TableDataExport {
  schema: string;
  table: string;
  /** Columns included in the INSERT, in table order. */
  columns: DataExportColumn[];
  rowCount: number;
  /** Exported id values (text) when an id column is exported, else null. */
  ids: string[] | null;
  /** The INSERT statement, or null when the table had no exportable rows. */
  insert: string | null;
}

const RAW_ID = '__raw_id';

/**
 * Export a table's rows as a single deterministic INSERT statement.
 * Values are text-cast server-side, emitted as literals re-cast to the
 * column type; rows are ordered by id when present, otherwise by all
 * exported columns, so output is reproducible.
 */
export const exportTableData = async (
  db: Queryable,
  spec: DataExportTableSpec,
  options: ExportTableDataOptions = {}
): Promise<TableDataExport> => {
  const excluded = new Set(options.excludeColumns ?? []);
  const allColumns = await getDataExportColumns(db, spec.schema, spec.table);
  const columns = allColumns.filter(
    c => !excluded.has(c.name) && !isVolatileTimestampColumn(c)
  );

  const base: TableDataExport = {
    schema: spec.schema,
    table: spec.table,
    columns,
    rowCount: 0,
    ids: null,
    insert: null
  };
  if (columns.length === 0) return base;

  const hasId = columns.some(c => c.name === 'id');

  const selectQb = new QueryBuilder()
    .schema(spec.schema)
    .table(spec.table)
    .select([]);
  for (const c of columns) {
    selectQb.selectExpr(c.name, cast(col(c.name), 'text'));
  }
  if (hasId) {
    selectQb.selectExpr(RAW_ID, cast(col('id'), 'text'));
    selectQb.orderBy(cast(col('id'), 'text'));
  } else {
    for (const c of columns) {
      selectQb.orderBy(col(c.name));
    }
  }
  if (spec.filter) {
    selectQb.where({ [spec.filter.column]: { equalTo: spec.filter.value } });
  }
  const { text: selectSql, values: selectValues } = selectQb.build();

  const rowsRes = await db.query(selectSql, selectValues);
  if (rowsRes.rows.length === 0) return base;

  const insertQb = new QueryBuilder()
    .schema(spec.schema)
    .table(spec.table)
    .insert(
      rowsRes.rows.map((row: Record<string, string | null>) =>
        Object.fromEntries(
          columns.map(c => [c.name, cast(lit(row[c.name]), c.type)])
        )
      )
    );
  if (options.conflictDoNothing) {
    insertQb.onConflict({ action: 'nothing' });
  }

  return {
    ...base,
    rowCount: rowsRes.rows.length,
    ids: hasId ? rowsRes.rows.map((r: any) => r[RAW_ID]) : null,
    insert: `${insertQb.build().text};`
  };
};

/**
 * Export multiple tables in the given (FK-dependency) order.
 */
export const exportTablesData = async (
  db: Queryable,
  specs: DataExportTableSpec[],
  options: ExportTableDataOptions = {}
): Promise<TableDataExport[]> => {
  const results: TableDataExport[] = [];
  for (const spec of specs) {
    results.push(await exportTableData(db, spec, options));
  }
  return results;
};

const REPLICA_HEADER = 'SET session_replication_role TO replica;';
const REPLICA_FOOTER = 'SET session_replication_role TO DEFAULT;';

const wrapReplica = (body: string[]): string =>
  [REPLICA_HEADER, '', ...body, '', REPLICA_FOOTER, ''].join('\n');

/**
 * Assemble the deploy script body: every table's INSERT in dependency order,
 * replayed with triggers/FKs suppressed. Callers prepend the pgpm change
 * header.
 */
export const buildDataDeployScript = (exports: TableDataExport[]): string => {
  const inserts = exports
    .filter(e => e.insert !== null)
    .map(e => e.insert as string);
  return wrapReplica([inserts.join('\n\n')]);
};

/**
 * Assemble the revert script body: per-table DELETEs of the exported rows in
 * reverse dependency order. Tables exported without an id column cannot be
 * precisely reverted and are skipped with a comment.
 */
export const buildDataRevertScript = (exports: TableDataExport[]): string => {
  const statements: string[] = [];
  for (const e of [...exports].reverse()) {
    if (e.rowCount === 0) continue;
    if (!e.ids) {
      statements.push(
        `-- ${e.schema}.${e.table}: exported without an id column; rows not reverted`
      );
      continue;
    }
    const { text } = new QueryBuilder()
      .schema(e.schema)
      .table(e.table)
      .delete()
      .where({ id: { in: e.ids.map(id => lit(id)) } })
      .build();
    statements.push(`${text};`);
  }
  return wrapReplica([statements.join('\n\n')]);
};

/**
 * Assemble the verify script body: per-table checks that the exported rows
 * are present (exact id match when ids were exported, row-count floor
 * otherwise). Divide-by-zero style, per pgpm verify conventions.
 */
export const buildDataVerifyScript = (exports: TableDataExport[]): string => {
  const statements: string[] = [];
  for (const e of exports) {
    if (e.rowCount === 0) continue;
    const countCheck = e.ids ? eq : gte;
    const qb = new QueryBuilder()
      .schema(e.schema)
      .table(e.table)
      .select([])
      .selectExpr(
        'verified',
        div(lit(1), cast(countCheck(fn('count', [col('*')]), lit(e.rowCount)), 'int'))
      );
    if (e.ids) {
      qb.where({ id: { in: e.ids.map(id => lit(id)) } });
    }
    statements.push(`${qb.build().text};`);
  }
  return statements.join('\n\n') + '\n';
};
