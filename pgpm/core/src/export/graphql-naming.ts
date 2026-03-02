/**
 * Helpers for mapping between PostgreSQL names and PostGraphile GraphQL names.
 * 
 * PostGraphile's inflection (with InflektPreset) transforms:
 *   - Table names: snake_case -> camelCase (pluralized for collections)
 *   - Column names: snake_case -> camelCase
 *   - Schema prefix is stripped (tables are exposed without schema prefix)
 * 
 * Examples:
 *   metaschema_public.database -> databases (query), Database (type)
 *   metaschema_public.foreign_key_constraint -> foreignKeyConstraints
 *   services_public.api_schemas -> apiSchemas
 *   db_migrate.sql_actions -> sqlActions
 *   column database_id -> databaseId
 */

/**
 * Convert a snake_case string to camelCase.
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
};

/**
 * Convert a camelCase string to snake_case.
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
};

/**
 * Simple pluralization for table names.
 * Handles common English plural rules used by PostGraphile.
 */
const pluralize = (word: string): string => {
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  if (word.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(word[word.length - 2])) {
    return word.slice(0, -1) + 'ies';
  }
  return word + 's';
};

/**
 * Known irregular plurals used by PostGraphile in this codebase.
 * Maps singular camelCase table name -> GraphQL query field name.
 */
const KNOWN_QUERY_NAMES: Record<string, string> = {
  // metaschema_public
  'database': 'databases',
  'schema': 'schemas',
  'table': 'tables',
  'field': 'fields',
  'policy': 'policies',
  'index': 'indices',
  'trigger': 'triggers',
  'trigger_function': 'triggerFunctions',
  // rls_function is NOT exposed as a separate query in the GraphQL schema
  // 'rls_function': 'rlsFunctions',
  'limit_function': 'limitFunctions',
  'procedure': 'procedures',
  'foreign_key_constraint': 'foreignKeyConstraints',
  'primary_key_constraint': 'primaryKeyConstraints',
  'unique_constraint': 'uniqueConstraints',
  'check_constraint': 'checkConstraints',
  'full_text_search': 'fullTextSearches',
  'schema_grant': 'schemaGrants',
  'table_grant': 'tableGrants',
  'view_grant': 'viewGrants',
  'view_table': 'viewTables',
  'database_extension': 'databaseExtensions',
  // services_public
  'domains': 'domains',
  'sites': 'sites',
  'apis': 'apis',
  'apps': 'apps',
  'site_modules': 'siteModules',
  'site_themes': 'siteThemes',
  'site_metadata': 'siteMetadata',
  'api_modules': 'apiModules',
  'api_schemas': 'apiSchemas',
  'api_extensions': 'apiExtensions',
  // metaschema_modules_public
  'rls_module': 'rlsModules',
  'user_auth_module': 'userAuthModules',
  'memberships_module': 'membershipsModules',
  'permissions_module': 'permissionsModules',
  'limits_module': 'limitsModules',
  'levels_module': 'levelsModules',
  'users_module': 'usersModules',
  'hierarchy_module': 'hierarchyModules',
  'membership_types_module': 'membershipTypesModules',
  'invites_module': 'invitesModules',
  'emails_module': 'emailsModules',
  'sessions_module': 'sessionsModules',
  'secrets_module': 'secretsModules',
  'profiles_module': 'profilesModules',
  'encrypted_secrets_module': 'encryptedSecretsModules',
  'connected_accounts_module': 'connectedAccountsModules',
  'phone_numbers_module': 'phoneNumbersModules',
  'crypto_addresses_module': 'cryptoAddressesModules',
  'crypto_auth_module': 'cryptoAuthModules',
  'field_module': 'fieldModules',
  'table_module': 'tableModules',
  'table_template_module': 'tableTemplateModules',
  'uuid_module': 'uuidModules',
  'default_ids_module': 'defaultIdsModules',
  'denormalized_table_field': 'denormalizedTableFields',
  'secure_table_provision': 'secureTableProvisions',
  'user_profiles_module': 'userProfilesModules',
  'user_settings_module': 'userSettingsModules',
  'organization_settings_module': 'organizationSettingsModules',
  'database_provision_module': 'databaseProvisionModules',
  // db_migrate
  'sql_actions': 'sqlActions',
};

/**
 * Get the GraphQL query field name for a given Postgres table name.
 * Uses known mappings first, then falls back to computed inflection.
 */
export const getGraphQLQueryName = (pgTableName: string): string => {
  if (KNOWN_QUERY_NAMES[pgTableName]) {
    return KNOWN_QUERY_NAMES[pgTableName];
  }
  // Fallback: convert snake_case to camelCase and pluralize
  const camel = snakeToCamel(pgTableName);
  return pluralize(camel);
};

/**
 * Convert a row of GraphQL camelCase keys back to Postgres snake_case keys.
 * This is needed because the csv-to-pg Parser expects snake_case column names.
 */
export const graphqlRowToPostgresRow = (
  row: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[camelToSnake(key)] = value;
  }
  return result;
};

/**
 * Convert a PostgreSQL interval object (from GraphQL Interval type) back to a Postgres interval string.
 * e.g. { years: 0, months: 0, days: 0, hours: 1, minutes: 30, seconds: 0 } -> '1 hour 30 minutes'
 */
export const intervalToPostgres = (interval: Record<string, number | null> | null): string | null => {
  if (!interval) return null;
  const parts: string[] = [];
  if (interval.years) parts.push(`${interval.years} year${interval.years !== 1 ? 's' : ''}`);
  if (interval.months) parts.push(`${interval.months} mon${interval.months !== 1 ? 's' : ''}`);
  if (interval.days) parts.push(`${interval.days} day${interval.days !== 1 ? 's' : ''}`);
  if (interval.hours) parts.push(`${interval.hours}:${String(interval.minutes ?? 0).padStart(2, '0')}:${String(interval.seconds ?? 0).padStart(2, '0')}`);
  else if (interval.minutes) parts.push(`00:${String(interval.minutes).padStart(2, '0')}:${String(interval.seconds ?? 0).padStart(2, '0')}`);
  else if (interval.seconds) parts.push(`00:00:${String(interval.seconds).padStart(2, '0')}`);
  return parts.length > 0 ? parts.join(' ') : '00:00:00';
};

/**
 * Convert an array of Postgres field names (with optional type hints) to a GraphQL fields fragment.
 * Handles composite types like 'interval' by expanding them into subfield selections.
 * e.g. [['id', 'uuid'], ['sessions_default_expiration', 'interval']] ->
 *   'id\nsessionsDefaultExpiration { seconds minutes hours days months years }'
 */
export const buildFieldsFragment = (
  pgFieldNames: string[],
  fieldTypes?: Record<string, string>
): string => {
  return pgFieldNames.map(name => {
    const camel = snakeToCamel(name);
    const fieldType = fieldTypes?.[name];
    if (fieldType === 'interval') {
      return `${camel} { seconds minutes hours days months years }`;
    }
    return camel;
  }).join('\n      ');
};
