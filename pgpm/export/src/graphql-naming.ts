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
import { toCamelCase, toPascalCase, toSnakeCase, distinctPluralize, singularizeLast } from 'inflekt';

/**
 * Get the GraphQL query field name for a given Postgres table name.
 * Mirrors the PostGraphile InflektPlugin's allRowsConnection inflector:
 *   toCamelCase(distinctPluralize(singularizeLast(toPascalCase(pgTableName))))
 */
export const getGraphQLQueryName = (pgTableName: string): string => {
  const pascal = toPascalCase(pgTableName);
  const singularized = singularizeLast(pascal);
  return toCamelCase(distinctPluralize(singularized));
};

/**
 * Convert a row of GraphQL camelCase keys back to Postgres snake_case keys.
 * This is needed because the csv-to-pg Parser expects snake_case column names.
 * Only transforms top-level keys — nested objects (e.g. JSONB values) are left intact.
 */
export const graphqlRowToPostgresRow = (
  row: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[toSnakeCase(key)] = value;
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
    const camel = toCamelCase(name);
    const fieldType = fieldTypes?.[name];
    if (fieldType === 'interval') {
      return `${camel} { seconds minutes hours days months years }`;
    }
    return camel;
  }).join('\n      ');
};
