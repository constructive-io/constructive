/**
 * Generic scalar mapping tables.
 *
 * Map source type names — Postgres types and JSON Schema types — to GraphQL
 * scalar names. They carry no plugin-specific logic, so they live here as
 * shared internals rather than co-located with any one plugin's derivation
 * code.
 */

/** GraphQL scalar type names produced by the mapping tables below. */
export type GraphQLScalarName =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'UUID'
  | 'Datetime'
  | 'BigFloat'
  | 'JSON';

/** Postgres type → GraphQL scalar name. */
export const PG_TYPE_SCALARS: Record<string, GraphQLScalarName> = {
  uuid: 'UUID',
  text: 'String',
  int: 'Int',
  boolean: 'Boolean',
  numeric: 'BigFloat',
  jsonb: 'JSON',
  timestamptz: 'Datetime'
};

/** JSON Schema type → GraphQL scalar name. */
export const JSON_SCHEMA_SCALARS: Record<string, GraphQLScalarName> = {
  string: 'String',
  integer: 'Int',
  number: 'Float',
  boolean: 'Boolean',
  object: 'JSON',
  null: 'JSON'
};
