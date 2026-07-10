import { PgpmOptions } from '@pgpmjs/types';
import { Parser } from 'csv-to-pg';
import { getPgPool } from 'pg-cache';
import type { Pool } from 'pg';

import { FieldType, TableConfig, META_TABLE_CONFIG, mapPgTypeToFieldType } from './export-utils';

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
  const getParser = async (key: string): Promise<Parser> => {
    if (parsers[key]) {
      return parsers[key];
    }

    const tableConfig = META_TABLE_CONFIG[key];
    if (!tableConfig) {
      throw new Error(`exportMeta: no META_TABLE_CONFIG entry for '${key}'`);
    }

    // Build fields dynamically based on actual database columns
    const dynamicFields = await buildDynamicFields(pool, tableConfig);

    if (Object.keys(dynamicFields).length === 0) {
      throw new Error(
        `exportMeta: table ${tableConfig.schema}.${tableConfig.table} not found or has no matching columns`
      );
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
    const parser = await getParser(key);

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
  };

  // =============================================================================
  // metaschema_public tables
  // =============================================================================
  await queryAndParse('database', `SELECT * FROM metaschema_public.database WHERE id = $1 ORDER BY id`);
  await queryAndParse('schema', `SELECT * FROM metaschema_public.schema WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('function', `SELECT * FROM metaschema_public.function WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('spatial_relation', `SELECT * FROM metaschema_public.spatial_relation WHERE database_id = $1 ORDER BY id`);
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
  await queryAndParse('database_settings', `SELECT * FROM services_public.database_settings WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('api_settings', `SELECT * FROM services_public.api_settings WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('rls_settings', `SELECT * FROM services_public.rls_settings WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('cors_settings', `SELECT * FROM services_public.cors_settings WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('pubkey_settings', `SELECT * FROM services_public.pubkey_settings WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('webauthn_settings', `SELECT * FROM services_public.webauthn_settings WHERE database_id = $1 ORDER BY id`);

  // =============================================================================
  // metaschema_modules_public tables
  // =============================================================================
  await queryAndParse('rls_module', `SELECT * FROM metaschema_modules_public.rls_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('user_auth_module', `SELECT * FROM metaschema_modules_public.user_auth_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('memberships_module', `SELECT * FROM metaschema_modules_public.memberships_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('permissions_module', `SELECT * FROM metaschema_modules_public.permissions_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('limits_module', `SELECT * FROM metaschema_modules_public.limits_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('levels_module', `SELECT * FROM metaschema_modules_public.levels_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('events_module', `SELECT * FROM metaschema_modules_public.events_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('users_module', `SELECT * FROM metaschema_modules_public.users_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('hierarchy_module', `SELECT * FROM metaschema_modules_public.hierarchy_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('membership_types_module', `SELECT * FROM metaschema_modules_public.membership_types_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('invites_module', `SELECT * FROM metaschema_modules_public.invites_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('emails_module', `SELECT * FROM metaschema_modules_public.emails_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('sessions_module', `SELECT * FROM metaschema_modules_public.sessions_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('user_state_module', `SELECT * FROM metaschema_modules_public.user_state_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('profiles_module', `SELECT * FROM metaschema_modules_public.profiles_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('config_secrets_user_module', `SELECT * FROM metaschema_modules_public.config_secrets_user_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('user_credentials_module', `SELECT * FROM metaschema_modules_public.user_credentials_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('user_settings_module', `SELECT * FROM metaschema_modules_public.user_settings_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('connected_accounts_module', `SELECT * FROM metaschema_modules_public.connected_accounts_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('phone_numbers_module', `SELECT * FROM metaschema_modules_public.phone_numbers_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('crypto_addresses_module', `SELECT * FROM metaschema_modules_public.crypto_addresses_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('crypto_auth_module', `SELECT * FROM metaschema_modules_public.crypto_auth_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('field_module', `SELECT * FROM metaschema_modules_public.field_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('table_module', `SELECT * FROM metaschema_modules_public.table_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('secure_table_provision', `SELECT * FROM metaschema_modules_public.secure_table_provision WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('uuid_module', `SELECT * FROM metaschema_modules_public.uuid_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('default_ids_module', `SELECT * FROM metaschema_modules_public.default_ids_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('denormalized_table_field', `SELECT * FROM metaschema_modules_public.denormalized_table_field WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('relation_provision', `SELECT * FROM metaschema_modules_public.relation_provision WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('entity_type_provision', `SELECT * FROM metaschema_modules_public.entity_type_provision WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('rate_limits_module', `SELECT * FROM metaschema_modules_public.rate_limits_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('storage_module', `SELECT * FROM metaschema_modules_public.storage_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('billing_module', `SELECT * FROM metaschema_modules_public.billing_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('billing_provider_module', `SELECT * FROM metaschema_modules_public.billing_provider_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('devices_module', `SELECT * FROM metaschema_modules_public.devices_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('identity_providers_module', `SELECT * FROM metaschema_modules_public.identity_providers_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('notifications_module', `SELECT * FROM metaschema_modules_public.notifications_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('plans_module', `SELECT * FROM metaschema_modules_public.plans_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('realtime_module', `SELECT * FROM metaschema_modules_public.realtime_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('session_secrets_module', `SELECT * FROM metaschema_modules_public.session_secrets_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('infra_secrets_module', `SELECT * FROM metaschema_modules_public.infra_secrets_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('infra_config_module', `SELECT * FROM metaschema_modules_public.infra_config_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('internal_secrets_module', `SELECT * FROM metaschema_modules_public.internal_secrets_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('i18n_module', `SELECT * FROM metaschema_modules_public.i18n_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('agent_module', `SELECT * FROM metaschema_modules_public.agent_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('function_module', `SELECT * FROM metaschema_modules_public.function_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('namespace_module', `SELECT * FROM metaschema_modules_public.namespace_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('merkle_store_module', `SELECT * FROM metaschema_modules_public.merkle_store_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('graph_module', `SELECT * FROM metaschema_modules_public.graph_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('graph_execution_module', `SELECT * FROM metaschema_modules_public.graph_execution_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('function_deployment_module', `SELECT * FROM metaschema_modules_public.function_deployment_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('function_invocation_module', `SELECT * FROM metaschema_modules_public.function_invocation_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('compute_log_module', `SELECT * FROM metaschema_modules_public.compute_log_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('db_usage_module', `SELECT * FROM metaschema_modules_public.db_usage_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('storage_log_module', `SELECT * FROM metaschema_modules_public.storage_log_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('transfer_log_module', `SELECT * FROM metaschema_modules_public.transfer_log_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('webauthn_auth_module', `SELECT * FROM metaschema_modules_public.webauthn_auth_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('webauthn_credentials_module', `SELECT * FROM metaschema_modules_public.webauthn_credentials_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('inference_log_module', `SELECT * FROM metaschema_modules_public.inference_log_module WHERE database_id = $1 ORDER BY id`);
  await queryAndParse('rate_limit_meters_module', `SELECT * FROM metaschema_modules_public.rate_limit_meters_module WHERE database_id = $1 ORDER BY id`);

  return sql;
};
