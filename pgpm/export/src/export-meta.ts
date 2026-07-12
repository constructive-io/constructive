import { PgpmOptions } from '@pgpmjs/types';
import { Parser } from 'csv-to-pg';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

import { FieldType, TableConfig, META_TABLE_CONFIG, META_TABLE_ORDER, mapPgTypeToFieldType } from './export-utils';

/**
 * Query actual columns from information_schema for a given table.
 * Returns a map of column_name -> udt_name (PostgreSQL type).
 */
const getTableColumns = async (pool: Pool, schemaName: string, tableName: string): Promise<Map<string, string>> => {
  const result = await pool.query(`
    SELECT column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schemaName, tableName]);

  const columns = new Map<string, string>();
  for (const row of result.rows) {
    columns.set(row.column_name, row.udt_name);
  }
  return columns;
};

/**
 * Build dynamic fields config from the database via information_schema.
 * - All fields are derived from `information_schema.columns` + `mapPgTypeToFieldType`.
 * - `typeOverrides` from the config are applied on top for special types
 *   (image, upload, url) that cannot be inferred from PG types alone.
 */
const buildDynamicFields = async (
  pool: Pool,
  tableConfig: TableConfig
): Promise<Record<string, FieldType>> => {
  const actualColumns = await getTableColumns(pool, tableConfig.schema, tableConfig.table);

  if (actualColumns.size === 0) {
    // Table doesn't exist, return empty fields
    return {};
  }

  const dynamicFields: Record<string, FieldType> = {};

  // Derive all fields from information_schema
  for (const [columnName, udtName] of actualColumns) {
    dynamicFields[columnName] = mapPgTypeToFieldType(udtName);
  }

  // Apply type overrides (image, upload, url)
  if (tableConfig.typeOverrides) {
    for (const [fieldName, fieldType] of Object.entries(tableConfig.typeOverrides)) {
      if (dynamicFields[fieldName]) {
        dynamicFields[fieldName] = fieldType;
      }
    }
  }

  // Omit columns that are marked as columnDefaults — their DDL DEFAULT (e.g.
  // current_database()) will supply the correct value at deploy time, so the
  // exported INSERT must not hardcode an environment-specific literal.
  if (tableConfig.columnDefaults) {
    for (const colName of Object.keys(tableConfig.columnDefaults)) {
      delete dynamicFields[colName];
    }
  }

  return dynamicFields;
};

interface ExportMetaParams {
  opts: PgpmOptions,
  dbname: string;
  database_id: string;
}

export type ExportMetaResult = Record<string, string>;

export const exportMeta = async ({ opts, dbname, database_id }: ExportMetaParams): Promise<ExportMetaResult> => {
  const pool = getPgPool({
    ...opts.pg,
    database: dbname
  });
  const sql: Record<string, string> = {};

  // Cache for dynamically built parsers and their field configs
  const parsers: Record<string, Parser> = {};
  const parserFields: Record<string, Record<string, FieldType>> = {};

  // Build parser dynamically by querying actual columns from the database
  const getParser = async (key: string): Promise<Parser | null> => {
    if (parsers[key]) {
      return parsers[key];
    }

    const tableConfig = META_TABLE_CONFIG[key];
    if (!tableConfig) {
      return null;
    }

    // Build fields dynamically based on actual database columns
    const dynamicFields = await buildDynamicFields(pool, tableConfig);

    if (Object.keys(dynamicFields).length === 0) {
      // No columns found (table doesn't exist or no matching columns)
      return null;
    }

    parserFields[key] = dynamicFields;

    const parser = new Parser({
      schema: tableConfig.schema,
      table: tableConfig.table,
      conflictDoNothing: tableConfig.conflictDoNothing,
      fields: dynamicFields
    });

    parsers[key] = parser;
    return parser;
  };

  const queryAndParse = async (key: string, query: string) => {
    try {
      const parser = await getParser(key);
      if (!parser) {
        return;
      }

      const result = await pool.query(query, [database_id]);
      if (result.rows.length) {
        // Truncate timestamptz to second precision to match PostGraphile's Datetime scalar
        // which truncates milliseconds in the GraphQL flow
        const fields = parserFields[key];
        if (fields) {
          for (const row of result.rows) {
            for (const [fieldName, fieldType] of Object.entries(fields)) {
              if (fieldType === 'timestamptz') {
                const val = row[fieldName];
                if (val instanceof Date) {
                  // Truncate to second precision and convert to ISO string
                  // so both SQL and GraphQL flows pass the same value type to the Parser
                  row[fieldName] = new Date(Math.floor(val.getTime() / 1000) * 1000).toISOString();
                }
              }
            }
          }
        }

        // Omit columnDefaults columns from row data so the Parser never sees them.
        // The Parser's field config already excludes them (via buildDynamicFields),
        // so they would be ignored anyway, but removing them from the data is cleaner.
        const tblCfg = META_TABLE_CONFIG[key];
        if (tblCfg?.columnDefaults) {
          for (const colName of Object.keys(tblCfg.columnDefaults)) {
            for (const row of result.rows) {
              delete row[colName];
            }
          }
        }

        const parsed = await parser.parse(result.rows);
        if (parsed) {
          sql[key] = parsed;
        }
      }
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '42P01') {
        return;
      }
      throw err;
    }
  };

  // Iterate the generated table manifest (already topologically sorted by FK
  // dependencies). All tables are keyed by database_id except `database`
  // itself, which is keyed by id.
  for (const key of META_TABLE_ORDER) {
    const tableConfig = META_TABLE_CONFIG[key];
    const filterColumn = key === 'database' ? 'id' : 'database_id';
    await queryAndParse(key, `SELECT * FROM ${tableConfig.schema}.${tableConfig.table} WHERE ${filterColumn} = $1 ORDER BY id`);
  }

  return sql;
};
