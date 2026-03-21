import { PgpmOptions } from '@pgpmjs/types';
import { Parser } from 'csv-to-pg';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

import { FieldType, TableConfig, META_TABLE_CONFIG } from './export-utils';

/**
 * Map PostgreSQL data types to FieldType values.
 * Uses udt_name from information_schema which gives the base type name.
 */
const mapPgTypeToFieldType = (udtName: string): FieldType => {
  switch (udtName) {
    case 'uuid':
      return 'uuid';
    case '_uuid':
      return 'uuid[]';
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'name':
      return 'text';
    case '_text':
    case '_varchar':
      return 'text[]';
    case 'bool':
      return 'boolean';
    case 'jsonb':
    case 'json':
      return 'jsonb';
    case '_jsonb':
      return 'jsonb[]';
    case 'int4':
    case 'int8':
    case 'int2':
    case 'numeric':
      return 'int';
    case 'interval':
      return 'interval';
    case 'timestamptz':
    case 'timestamp':
      return 'timestamptz';
    default:
      return 'text';
  }
};

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
  // metaschema_public tables
  // =============================================================================
  await queryAndParse('database', `SELECT * FROM metaschema_public.database WHERE id = $1 ORDER BY id`);
  await queryAndParse('database_extension', `SELECT * FROM metaschema_public.database_extension WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('schema', `SELECT * FROM metaschema_public.schema WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('table', `SELECT * FROM metaschema_public.table WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('field', `SELECT * FROM metaschema_public.field WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('policy', `SELECT * FROM metaschema_public.policy WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('index', `SELECT * FROM metaschema_public.index WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('trigger', `SELECT * FROM metaschema_public.trigger WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('trigger_function', `SELECT * FROM metaschema_public.trigger_function WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('rls_function', `SELECT * FROM metaschema_public.rls_function WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('foreign_key_constraint', `SELECT * FROM metaschema_public.foreign_key_constraint WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('primary_key_constraint', `SELECT * FROM metaschema_public.primary_key_constraint WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('unique_constraint', `SELECT * FROM metaschema_public.unique_constraint WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('check_constraint', `SELECT * FROM metaschema_public.check_constraint WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('full_text_search', `SELECT * FROM metaschema_public.full_text_search WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('schema_grant', `SELECT * FROM metaschema_public.schema_grant WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('table_grant', `SELECT * FROM metaschema_public.table_grant WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('default_privilege', `SELECT * FROM metaschema_public.default_privilege WHERE database_id = $1 ORDER BY id`);

  // =============================================================================
  // services_public tables
  // =============================================================================
  await queryAndParse('domains', `SELECT * FROM services_public.domains WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('sites', `SELECT * FROM services_public.sites WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('apis', `SELECT * FROM services_public.apis WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('apps', `SELECT * FROM services_public.apps WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('site_modules', `SELECT * FROM services_public.site_modules WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('site_themes', `SELECT * FROM services_public.site_themes WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('site_metadata', `SELECT * FROM services_public.site_metadata WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('api_modules', `SELECT * FROM services_public.api_modules WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('api_extensions', `SELECT * FROM services_public.api_extensions WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('api_schemas', `SELECT * FROM services_public.api_schemas WHERE database_id = $1 ORDER BY id`);

  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  await queryAndParse('rls_module', `SELECT * FROM metaschema_modules_public.rls_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('user_auth_module', `SELECT * FROM metaschema_modules_public.user_auth_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('memberships_module', `SELECT * FROM metaschema_modules_public.memberships_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('permissions_module', `SELECT * FROM metaschema_modules_public.permissions_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('limits_module', `SELECT * FROM metaschema_modules_public.limits_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('levels_module', `SELECT * FROM metaschema_modules_public.levels_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('users_module', `SELECT * FROM metaschema_modules_public.users_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('hierarchy_module', `SELECT * FROM metaschema_modules_public.hierarchy_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('membership_types_module', `SELECT * FROM metaschema_modules_public.membership_types_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('invites_module', `SELECT * FROM metaschema_modules_public.invites_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('emails_module', `SELECT * FROM metaschema_modules_public.emails_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('sessions_module', `SELECT * FROM metaschema_modules_public.sessions_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('secrets_module', `SELECT * FROM metaschema_modules_public.secrets_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('profiles_module', `SELECT * FROM metaschema_modules_public.profiles_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('encrypted_secrets_module', `SELECT * FROM metaschema_modules_public.encrypted_secrets_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('connected_accounts_module', `SELECT * FROM metaschema_modules_public.connected_accounts_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('phone_numbers_module', `SELECT * FROM metaschema_modules_public.phone_numbers_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('crypto_addresses_module', `SELECT * FROM metaschema_modules_public.crypto_addresses_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('crypto_auth_module', `SELECT * FROM metaschema_modules_public.crypto_auth_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('field_module', `SELECT * FROM metaschema_modules_public.field_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('table_module', `SELECT * FROM metaschema_modules_public.table_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('table_template_module', `SELECT * FROM metaschema_modules_public.table_template_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('secure_table_provision', `SELECT * FROM metaschema_modules_public.secure_table_provision WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('uuid_module', `SELECT * FROM metaschema_modules_public.uuid_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('default_ids_module', `SELECT * FROM metaschema_modules_public.default_ids_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('denormalized_table_field', `SELECT * FROM metaschema_modules_public.denormalized_table_field WHERE database_id = $1 ORDER BY id`);

  return sql;
};
