/**
 * GraphQL equivalent of export-meta.ts.
 * 
 * Fetches metadata from metaschema_public, services_public, and metaschema_modules_public
 * via GraphQL queries instead of direct SQL, then uses the same csv-to-pg Parser to
 * generate SQL INSERT statements.
 */
import { Parser } from 'csv-to-pg';

import { FieldType, META_TABLE_CONFIG } from './export-utils';
import { GraphQLClient } from './graphql-client';
import {
  buildFieldsFragment,
  getGraphQLQueryName,
  graphqlRowToPostgresRow,
  intervalToPostgres
} from './graphql-naming';

export interface ExportGraphQLMetaParams {
  /** GraphQL client configured for the meta/services API endpoint */
  client: GraphQLClient;
  /** The database_id to filter by */
  database_id: string;
}

export type ExportGraphQLMetaResult = Record<string, string>;

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

    const pgFieldNames = Object.keys(tableConfig.fields);
    const graphqlFieldsFragment = buildFieldsFragment(pgFieldNames, tableConfig.fields);
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
        const pgRows = rows.map(row => {
          const pgRow = graphqlRowToPostgresRow(row);
          // Convert any interval fields from {seconds, minutes, ...} objects to strings
          for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
            if (fieldType === 'interval' && pgRow[fieldName] && typeof pgRow[fieldName] === 'object') {
              pgRow[fieldName] = intervalToPostgres(pgRow[fieldName] as Record<string, number | null>);
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
        for (const [fieldName, fieldType] of Object.entries(tableConfig.fields)) {
          if (returnedKeys.has(fieldName)) {
            dynamicFields[fieldName] = fieldType;
          }
        }

        if (Object.keys(dynamicFields).length === 0) return;

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
    queryAndParse('database_extension'),
    queryAndParse('schema'),
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
    queryAndParse('api_schemas')
  ]);

  // metaschema_modules_public tables
  await Promise.all([
    queryAndParse('rls_module'),
    queryAndParse('user_auth_module'),
    queryAndParse('memberships_module'),
    queryAndParse('permissions_module'),
    queryAndParse('limits_module'),
    queryAndParse('levels_module'),
    queryAndParse('users_module'),
    queryAndParse('hierarchy_module'),
    queryAndParse('membership_types_module'),
    queryAndParse('invites_module'),
    queryAndParse('emails_module'),
    queryAndParse('sessions_module'),
    queryAndParse('secrets_module'),
    queryAndParse('profiles_module'),
    queryAndParse('encrypted_secrets_module'),
    queryAndParse('connected_accounts_module'),
    queryAndParse('phone_numbers_module'),
    queryAndParse('crypto_addresses_module'),
    queryAndParse('crypto_auth_module'),
    queryAndParse('field_module'),
    queryAndParse('table_module'),
    queryAndParse('table_template_module'),
    queryAndParse('secure_table_provision'),
    queryAndParse('uuid_module'),
    queryAndParse('default_ids_module'),
    queryAndParse('denormalized_table_field')
  ]);

  return sql;
};
