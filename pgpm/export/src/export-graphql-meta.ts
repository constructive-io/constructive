/**
 * GraphQL equivalent of export-meta.ts.
 * 
 * Fetches metadata from metaschema_public, services_public, and metaschema_modules_public
 * via GraphQL queries instead of direct SQL, then uses the same csv-to-pg Parser to
 * generate SQL INSERT statements.
 */
import { Parser } from 'csv-to-pg';
import { toSnakeCase } from 'inflekt';

import { FieldType, META_TABLE_CONFIG, TableConfig } from './export-utils';
import { GraphQLClient } from './graphql-client';
import {
  buildFieldsFragment,
  getGraphQLQueryName,
  getGraphQLTypeName,
  graphqlRowToPostgresRow,
  intervalToPostgres,
  mapGraphQLTypeToFieldType
} from './graphql-naming';
import { lookupByGqlType } from './type-map';

export interface ExportGraphQLMetaParams {
  /** GraphQL client configured for the meta/services API endpoint */
  client: GraphQLClient;
  /** The database_id to filter by */
  database_id: string;
}

export type ExportGraphQLMetaResult = Record<string, string>;

/**
 * Result of dynamic field discovery from GraphQL introspection.
 * Includes the field type map and metadata needed for value normalization.
 */
interface DynamicFieldsResult {
  /** Map of snake_case field name -> FieldType */
  fields: Record<string, FieldType>;
  /** Set of snake_case field names that are ENUM-typed (need lowercase normalization) */
  enumFields: Set<string>;
}

/**
 * Discover fields dynamically from a GraphQL type via introspection.
 * Queries `__type` to enumerate fields and infer their `FieldType` via
 * `mapGraphQLTypeToFieldType`. Tracks ENUM fields separately so callers
 * can normalize their CONSTANT_CASE values back to lowercase.
 *
 * `typeOverrides` from the config are applied on top for special types
 * (image, upload, url) that cannot be inferred from the GraphQL type alone.
 */
const buildDynamicFieldsFromGraphQL = async (
  client: GraphQLClient,
  tableConfig: TableConfig
): Promise<DynamicFieldsResult> => {
  const emptyResult: DynamicFieldsResult = { fields: {}, enumFields: new Set() };

  const typeName = tableConfig.gqlTypeName || getGraphQLTypeName(tableConfig.table);

  try {
    const introspectedFields = await client.introspectType(typeName);

    const dynamicFields: Record<string, FieldType> = {};
    const enumFields = new Set<string>();
    for (const [camelName, typeInfo] of introspectedFields) {
      const snakeName = toSnakeCase(camelName);
      // Skip internal GraphQL fields
      if (camelName.startsWith('__')) continue;
      // Track enum fields for lowercase normalization (custom inflector uppercases them)
      if (typeInfo.kind === 'ENUM') {
        enumFields.add(snakeName);
      }
      // Skip non-scalar fields (relations/computed columns like "database" of type Database)
      // Only SCALAR and ENUM kinds can be selected without sub-field selections
      // EXCEPTION: types registered as non-SCALAR in PG_TYPE_MAP (e.g. Interval=OBJECT)
      // are handled via buildFieldsFragment sub-selections and intervalToPostgres conversion
      if (typeInfo.kind !== 'SCALAR' && typeInfo.kind !== 'ENUM') {
        const mapEntry = lookupByGqlType(typeInfo.typeName);
        if (mapEntry && mapEntry.gqlKind !== 'SCALAR') {
          dynamicFields[snakeName] = mapEntry.fieldType;
          continue;
        }
        continue;
      }
      dynamicFields[snakeName] = mapGraphQLTypeToFieldType(typeInfo.typeName, typeInfo.list);
    }

    // Apply type overrides (e.g., image, upload, url)
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
        enumFields.delete(colName);
      }
    }

    return { fields: dynamicFields, enumFields };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('Cannot query field') ||
      message.includes('is not defined by type') ||
      message.includes('Unknown field')
    ) {
      // Type not available in the GraphQL schema — return empty
      return emptyResult;
    }
    throw err;
  }
};

/**
 * Fetch metadata via GraphQL and generate SQL INSERT statements.
 * This is the GraphQL equivalent of exportMeta() in export-meta.ts.
 */
export const exportGraphQLMeta = async ({
  client,
  database_id
}: ExportGraphQLMetaParams): Promise<ExportGraphQLMetaResult> => {
  const sql: Record<string, string> = {};

  const queryAndParse = async (key: string) => {
    const tableConfig = META_TABLE_CONFIG[key];
    if (!tableConfig) return;

    // Build fields dynamically: either from hardcoded config or via introspection
    const { fields: configFields, enumFields } = await buildDynamicFieldsFromGraphQL(client, tableConfig);
    if (Object.keys(configFields).length === 0) return;

    const pgFieldNames = Object.keys(configFields);
    const graphqlFieldsFragment = buildFieldsFragment(pgFieldNames, configFields);
    const graphqlQueryName = getGraphQLQueryName(tableConfig.table);

    // The 'database' table is fetched by id, not by database_id
    const condition = key === 'database'
      ? { id: database_id }
      : { databaseId: database_id };

    try {
      const rows = await client.fetchAllNodes(
        graphqlQueryName,
        graphqlFieldsFragment,
        condition
      );

      if (rows.length > 0) {
        // Convert camelCase GraphQL keys back to snake_case for the Parser
        // Also convert interval objects back to Postgres interval strings
        // and normalize enum values from CONSTANT_CASE back to lowercase
        const pgRows = rows.map(row => {
          const pgRow = graphqlRowToPostgresRow(row);
          for (const [fieldName, fieldType] of Object.entries(configFields)) {
            // Convert interval fields from {seconds, minutes, ...} objects to strings
            if (fieldType === 'interval' && pgRow[fieldName] && typeof pgRow[fieldName] === 'object') {
              pgRow[fieldName] = intervalToPostgres(pgRow[fieldName] as Record<string, number | null>);
            }
            // Truncate timestamptz to second precision for parity with SQL flow
            // PostGraphile's Datetime scalar preserves full millisecond precision,
            // but the pg driver + our SQL flow truncates to .000Z via Date rounding
            if (fieldType === 'timestamptz' && typeof pgRow[fieldName] === 'string') {
              const d = new Date(pgRow[fieldName] as string);
              if (!isNaN(d.getTime())) {
                pgRow[fieldName] = new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString();
              }
            }
          }
          // Normalize enum values: custom inflector uppercases them to CONSTANT_CASE,
          // but PostgreSQL stores them in lowercase — convert back for parity with SQL flow
          for (const fieldName of enumFields) {
            if (typeof pgRow[fieldName] === 'string') {
              pgRow[fieldName] = (pgRow[fieldName] as string).toLowerCase();
            }
          }
          return pgRow;
        });

        // Filter fields to only those that exist in the returned data
        // This mirrors the dynamic field building in the SQL version
        const returnedKeys = new Set<string>();
        for (const row of pgRows) {
          for (const k of Object.keys(row)) {
            returnedKeys.add(k);
          }
        }

        const dynamicFields: Record<string, FieldType> = {};
        for (const [fieldName, fieldType] of Object.entries(configFields)) {
          if (returnedKeys.has(fieldName)) {
            dynamicFields[fieldName] = fieldType;
          }
        }

        if (Object.keys(dynamicFields).length === 0) return;

        // Omit columnDefaults columns from row data so the Parser never sees them.
        // configFields already excludes them (via buildDynamicFieldsFromGraphQL),
        // so dynamicFields won't contain them either — but the pgRow data still does.
        if (tableConfig.columnDefaults) {
          for (const colName of Object.keys(tableConfig.columnDefaults)) {
            for (const row of pgRows) {
              delete row[colName];
            }
          }
        }

        const parser = new Parser({
          schema: tableConfig.schema,
          table: tableConfig.table,
          conflictDoNothing: tableConfig.conflictDoNothing,
          fields: dynamicFields
        });

        const parsed = await parser.parse(pgRows);
        if (parsed) {
          sql[key] = parsed;
        }
      }
    } catch (err: unknown) {
      // If the GraphQL query fails (e.g. table not exposed), skip silently
      // similar to how the SQL version handles 42P01 (undefined_table)
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('Cannot query field') ||
        message.includes('is not defined by type') ||
        message.includes('Unknown field') ||
        (message.includes('Field') && message.includes('not found'))
      ) {
        // Field/table not available in the GraphQL schema — skip
        return;
      }
      throw err;
    }
  };

  // Batch queries by schema group — independent HTTP requests run in parallel
  // within each group for significant speedup over sequential awaits.

  // metaschema_public tables
  await Promise.all([
    queryAndParse('database'),
    queryAndParse('schema'),
    queryAndParse('function'),
    queryAndParse('spatial_relation'),
    queryAndParse('table'),
    queryAndParse('field'),
    queryAndParse('policy'),
    queryAndParse('index'),
    queryAndParse('trigger'),
    queryAndParse('trigger_function'),
    queryAndParse('rls_function'),
    queryAndParse('foreign_key_constraint'),
    queryAndParse('primary_key_constraint'),
    queryAndParse('unique_constraint'),
    queryAndParse('check_constraint'),
    queryAndParse('full_text_search'),
    queryAndParse('schema_grant'),
    queryAndParse('table_grant'),
    queryAndParse('default_privilege')
  ]);

  // services_public tables
  await Promise.all([
    queryAndParse('domains'),
    queryAndParse('sites'),
    queryAndParse('apis'),
    queryAndParse('apps'),
    queryAndParse('site_modules'),
    queryAndParse('site_themes'),
    queryAndParse('site_metadata'),
    queryAndParse('api_modules'),
    queryAndParse('api_extensions'),
    queryAndParse('api_schemas'),
    queryAndParse('database_settings'),
    queryAndParse('api_settings'),
    queryAndParse('rls_settings'),
    queryAndParse('cors_settings'),
    queryAndParse('pubkey_settings'),
    queryAndParse('webauthn_settings')
  ]);

  // metaschema_modules_public tables
  await Promise.all([
    queryAndParse('rls_module'),
    queryAndParse('user_auth_module'),
    queryAndParse('memberships_module'),
    queryAndParse('permissions_module'),
    queryAndParse('limits_module'),
    queryAndParse('levels_module'),
    queryAndParse('events_module'),
    queryAndParse('users_module'),
    queryAndParse('hierarchy_module'),
    queryAndParse('membership_types_module'),
    queryAndParse('invites_module'),
    queryAndParse('emails_module'),
    queryAndParse('sessions_module'),
    queryAndParse('user_state_module'),
    queryAndParse('profiles_module'),
    queryAndParse('config_secrets_user_module'),
    queryAndParse('user_credentials_module'),
    queryAndParse('user_settings_module'),
    queryAndParse('connected_accounts_module'),
    queryAndParse('phone_numbers_module'),
    queryAndParse('crypto_addresses_module'),
    queryAndParse('crypto_auth_module'),
    queryAndParse('field_module'),
    queryAndParse('table_module'),
    queryAndParse('secure_table_provision'),
    queryAndParse('uuid_module'),
    queryAndParse('default_ids_module'),
    queryAndParse('denormalized_table_field'),
    queryAndParse('relation_provision'),
    queryAndParse('entity_type_provision'),
    queryAndParse('rate_limits_module'),
    queryAndParse('storage_module'),
    queryAndParse('billing_module'),
    queryAndParse('billing_provider_module'),
    queryAndParse('devices_module'),
    queryAndParse('identity_providers_module'),
    queryAndParse('notifications_module'),
    queryAndParse('plans_module'),
    queryAndParse('realtime_module'),
    queryAndParse('session_secrets_module'),
    queryAndParse('infra_secrets_module'),
    queryAndParse('infra_config_module'),
    queryAndParse('internal_secrets_module'),
    queryAndParse('i18n_module'),
    queryAndParse('agent_module'),
    queryAndParse('function_module'),
    queryAndParse('namespace_module'),
    queryAndParse('merkle_store_module'),
    queryAndParse('graph_module'),
    queryAndParse('graph_execution_module'),
    queryAndParse('function_deployment_module'),
    queryAndParse('function_invocation_module'),
    queryAndParse('compute_log_module'),
    queryAndParse('db_usage_module'),
    queryAndParse('storage_log_module'),
    queryAndParse('transfer_log_module'),
    queryAndParse('webauthn_auth_module'),
    queryAndParse('webauthn_credentials_module'),
    queryAndParse('inference_log_module'),
    queryAndParse('rate_limit_meters_module')
  ]);

  return sql;
};
