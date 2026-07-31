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
 *   constructive_routing_public.api_schemas -> apiSchemas
 *   constructive_apps_public.apps -> apps
 *   metaschema_modules_public.api_surface_module -> apiSurfaceModules
 *   db_migrate.sql_actions -> sqlActions
 *   column database_id -> databaseId
 */
import { distinctPluralize, singularizeLast,toCamelCase, toPascalCase, toSnakeCase } from 'inflekt';

import { FieldType } from './export-utils';
import { lookupByGqlType } from './type-map';

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

export { intervalToPostgres } from './interval-utils';

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
 * Delegates to the canonical PG_TYPE_MAP in type-map.ts.
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

  // ID is a GraphQL-only type (relay-style) that maps to uuid;
  // it has no direct PG udt_name counterpart in PG_TYPE_MAP.
  if (gqlTypeName === 'ID') return 'uuid';

  const entry = lookupByGqlType(gqlTypeName);
  return entry?.fieldType ?? 'text';
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
