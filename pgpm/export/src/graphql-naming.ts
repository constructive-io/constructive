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

import { FieldType } from './export-utils';

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

// =============================================================================
// GraphQL introspection helpers
// =============================================================================

/**
 * Represents the unwrapped type info from a GraphQL introspection field.
 * PostGraphile wraps types in NON_NULL and LIST layers via nested `ofType`.
 */
export interface GraphQLTypeInfo {
  /** The leaf/nullable type name (e.g. "UUID", "String", "Interval") */
  typeName: string;
  /** The leaf type kind (e.g. "SCALAR", "OBJECT", "ENUM") */
  kind: string;
  /** Whether the outermost wrapper is NON_NULL */
  nonNull: boolean;
  /** Whether the type is a list */
  list: boolean;
}

/**
 * Unwrap a GraphQL introspection type reference into its leaf type name and list status.
 * PostGraphile wraps types like: { kind: NON_NULL, name: null, ofType: { kind: LIST, name: null, ofType: { kind: SCALAR, name: "UUID" } } }
 * This function recursively unwraps ofType layers, detecting LIST wrappers via the `kind` field.
 */
export const unwrapGraphQLType = (
  typeRef: { name: string | null; kind?: string; ofType?: any } | null,
  parentKind?: string
): GraphQLTypeInfo => {
  if (!typeRef) return { typeName: 'Unknown', kind: 'UNKNOWN', nonNull: false, list: false };

  // If the type has a name, it's the leaf type
  if (typeRef.name) {
    const isList = parentKind === 'LIST';
    return { typeName: typeRef.name, kind: typeRef.kind ?? 'UNKNOWN', nonNull: parentKind === 'NON_NULL', list: isList };
  }

  // If it has ofType, it's a wrapper (NON_NULL or LIST)
  if (typeRef.ofType) {
    return unwrapGraphQLType(typeRef.ofType, typeRef.kind ?? undefined);
  }

  return { typeName: 'Unknown', kind: 'UNKNOWN', nonNull: false, list: false };
};

/**
 * Map GraphQL scalar/type names to FieldType values.
 * Must stay aligned with mapPgTypeToFieldType() per the Type Mapping Alignment Table.
 */
export const mapGraphQLTypeToFieldType = (gqlTypeName: string, isList = false): FieldType => {
  // Handle list types — map to the array variants that exist in FieldType
  if (isList) {
    const inner = mapGraphQLTypeToFieldType(gqlTypeName, false);
    // Only these array types exist in FieldType: uuid[], text[], jsonb[]
    switch (inner) {
      case 'uuid': return 'uuid[]';
      case 'text': return 'text[]';
      case 'jsonb': return 'jsonb[]';
      default: return 'text'; // safe fallback for unsupported array types
    }
  }

  switch (gqlTypeName) {
    case 'UUID':
    case 'ID':
      return 'uuid';
    case 'String':
      return 'text';
    case 'Boolean':
      return 'boolean';
    case 'Int':
    case 'BigInt':
    case 'BigFloat':
    case 'Float':
      return 'int';
    case 'JSON':
      return 'jsonb';
    case 'Interval':
      return 'interval';
    case 'Datetime':
      return 'timestamptz';
    default:
      return 'text'; // safe fallback — matches mapPgTypeToFieldType's default
  }
};

/**
 * Derive the GraphQL type name (PascalCase singular) from a PostgreSQL table name.
 * Mirrors PostGraphile's InflektPlugin type inflector:
 *   singularizeLast(toPascalCase(pgTableName))
 * e.g. "user_auth_module" → "UserAuthModule"
 */
export const getGraphQLTypeName = (pgTableName: string): string => {
  return singularizeLast(toPascalCase(pgTableName));
};
