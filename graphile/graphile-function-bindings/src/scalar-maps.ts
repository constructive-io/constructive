/**
 * Generic scalar mapping tables shared by input type derivation.
 *
 * These map source type names (Postgres payload_args types and JSON Schema
 * types) to the plugin's `DerivedScalar` kinds. They carry no plugin-specific
 * logic, so they live apart from derive.ts to keep the derivation contract
 * (`DerivedScalar`/`DerivedField`/`DerivedInput`) focused.
 */

import type { DerivedScalar } from './derive';

/** Postgres payload_args type → GraphQL scalar name. */
export const PG_TYPE_SCALARS: Record<string, DerivedScalar> = {
  uuid: 'UUID',
  text: 'String',
  int: 'Int',
  boolean: 'Boolean',
  numeric: 'BigFloat',
  jsonb: 'JSON',
  timestamptz: 'Datetime'
};

/** JSON Schema type → GraphQL scalar name. */
export const JSON_SCHEMA_SCALARS: Record<string, DerivedScalar> = {
  string: 'String',
  integer: 'Int',
  number: 'Float',
  boolean: 'Boolean',
  object: 'JSON',
  null: 'JSON'
};
