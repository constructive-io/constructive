import { PgpmOptions } from '@pgpmjs/types';
import { Parser } from 'csv-to-pg';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

import {
  FieldType,
  TableConfig,
  META_TABLE_CONFIG,
  META_TABLE_ORDER,
  EXPORT_SCHEMAS,
  EXPORT_BLACKLIST,
  mapPgTypeToFieldType
} from './export-utils';

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
 * Build dynamic fields config by intersecting the hardcoded config with actual database columns.
 * - Only includes columns that exist in the database
 * - Preserves special type hints from config (image, upload, url) for columns that exist
 * - Infers types from PostgreSQL for columns not in config
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

  // For each column in the hardcoded config, check if it exists in the database
  for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
    if (actualColumns.has(fieldName)) {
      // Column exists - use the config's type hint (preserves special types like 'image', 'upload', 'url')
      dynamicFields[fieldName] = fieldType;
    }
    // If column doesn't exist in database, skip it (this fixes the bug)
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

  // Cache for dynamically built parsers
  const parsers: Record<string, Parser> = {};

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

  // =============================================================================
  // Phase 1: Export all configured tables in META_TABLE_ORDER
  // =============================================================================
  for (const key of META_TABLE_ORDER) {
    const config = META_TABLE_CONFIG[key];
    if (!config) continue;
    const filter_col = key === 'database' ? 'id' : 'database_id';
    await queryAndParse(
      key,
      `SELECT * FROM ${config.schema}.${config.table} WHERE ${filter_col} = $1 ORDER BY id`
    );
  }

  // =============================================================================
  // Phase 2: Auto-discover tables not yet in META_TABLE_ORDER
  // New tables in the export schemas are automatically picked up without
  // any config changes. Blacklisted tables are skipped.
  // =============================================================================
  const configured_tables = new Set<string>(META_TABLE_ORDER as unknown as string[]);

  const discovered = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `, [EXPORT_SCHEMAS as unknown as string[]]);

  for (const row of discovered.rows) {
    const table_name: string = row.table_name;
    const table_schema: string = row.table_schema;

    if (configured_tables.has(table_name) || EXPORT_BLACKLIST.has(table_name)) {
      continue;
    }

    // Auto-infer field types from information_schema
    const columns = await getTableColumns(pool, table_schema, table_name);
    if (columns.size === 0) continue;

    const fields: Record<string, FieldType> = {};
    for (const [col_name, udt_name] of columns) {
      fields[col_name] = mapPgTypeToFieldType(udt_name);
    }

    const auto_config: TableConfig = { schema: table_schema, table: table_name, fields };
    const filter_col = columns.has('database_id') ? 'database_id' : 'id';

    try {
      const auto_parser = new Parser({
        schema: auto_config.schema,
        table: auto_config.table,
        fields
      });

      const result = await pool.query(
        `SELECT * FROM ${table_schema}.${table_name} WHERE ${filter_col} = $1 ORDER BY id`,
        [database_id]
      );
      if (result.rows.length) {
        const parsed = await auto_parser.parse(result.rows);
        if (parsed) {
          sql[table_name] = parsed;
        }
      }
    } catch (err: unknown) {
      const pg_error = err as { code?: string };
      if (pg_error.code === '42P01') continue;
      throw err;
    }
  }

  return sql;
};
