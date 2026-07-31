/**
 * Unit tests for dynamic field discovery logic.
 *
 * Validates:
 * 1. Type mapping parity: mapPgTypeToFieldType and mapGraphQLTypeToFieldType
 *    agree on equivalent types (Type Mapping Alignment Table).
 * 2. Round-trip field name verification: toSnakeCase(toCamelCase(snake_name))
 *    === snake_name for all META_TABLE_CONFIG table/field names.
 * 3. mapPgTypeToFieldType and mapGraphQLTypeToFieldType correctness.
 * 4. typeOverrides take precedence over introspected types.
 */

import { toCamelCase, toSnakeCase } from 'inflekt';

import {
  FieldType,
  mapPgTypeToFieldType,
  META_TABLE_CONFIG} from '../src/export-utils';
import {
  getGraphQLQueryName,
  getGraphQLTypeName,
  mapGraphQLTypeToFieldType,
  unwrapGraphQLType} from '../src/graphql-naming';
import { PG_TYPE_MAP } from '../src/type-map';

// =============================================================================
// Task 10: Type Mapping Parity Validation
// =============================================================================

describe('Type mapping parity: mapPgTypeToFieldType vs mapGraphQLTypeToFieldType', () => {
  // Derived from the canonical PG_TYPE_MAP — adding a type there
  // automatically updates both mappers and this test.
  const parityTable: Array<[string, string, FieldType]> = PG_TYPE_MAP.flatMap(entry =>
    entry.pgUdtNames.map(pgUdt => [pgUdt, entry.gqlTypeName, entry.fieldType] as [string, string, FieldType])
  );

  for (const [pgUdtName, gqlTypeName, expectedFieldType] of parityTable) {
    const isPgArray = pgUdtName.startsWith('_');

    it(`PG "${pgUdtName}" ↔ GQL "${gqlTypeName}"${isPgArray ? ' (array)' : ''} → FieldType "${expectedFieldType}"`, () => {
      expect(mapPgTypeToFieldType(pgUdtName)).toBe(expectedFieldType);
      expect(mapGraphQLTypeToFieldType(gqlTypeName, isPgArray)).toBe(expectedFieldType);
    });
  }

  it('unknown PG type and unknown GQL type both fall back to "text"', () => {
    expect(mapPgTypeToFieldType('unknown_type')).toBe('text');
    expect(mapGraphQLTypeToFieldType('UnknownScalar', false)).toBe('text');
  });

  it('ID GraphQL type maps to uuid FieldType (parity with uuid PG type)', () => {
    expect(mapGraphQLTypeToFieldType('ID', false)).toBe('uuid');
  });
});

// =============================================================================
// Task 11: Round-trip field name verification
// =============================================================================

describe('Round-trip field name verification: snake_case → camelCase → snake_case', () => {
  /**
   * Known table names that don't round-trip through camelCase.
   * These use well-known abbreviations (e.g. i18n) that the inflekt library
   * doesn't preserve when converting back to snake_case.
   * Adding a gqlTypeName override in the config acknowledges the exception.
   */
  const knownNonRoundTrippingKeys = new Set(['i18n_module']);

  it('every META_TABLE_CONFIG table name round-trips through camelCase conversion', () => {
    const failures: string[] = [];

    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      if (knownNonRoundTrippingKeys.has(key)) continue;
      const original = config.table;
      const camel = toCamelCase(original);
      const roundTrip = toSnakeCase(camel);
      if (roundTrip !== original) {
        failures.push(`${key}: "${original}" → camelCase("${camel}") → snake_case("${roundTrip}")`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('every META_TABLE_CONFIG key round-trips through camelCase conversion', () => {
    const failures: string[] = [];

    for (const key of Object.keys(META_TABLE_CONFIG)) {
      if (knownNonRoundTrippingKeys.has(key)) continue;
      const camel = toCamelCase(key);
      const roundTrip = toSnakeCase(camel);
      if (roundTrip !== key) {
        failures.push(`"${key}" → camelCase("${camel}") → snake_case("${roundTrip}")`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('known non-round-tripping table names have gqlTypeName overrides', () => {
    // Verify that every known exception has a gqlTypeName override,
    // ensuring the GraphQL flow still works correctly despite the naming mismatch.
    for (const key of knownNonRoundTrippingKeys) {
      const config = META_TABLE_CONFIG[key];
      expect(config).toBeDefined();
      expect(config.gqlTypeName).toBeDefined();
      expect(config.gqlTypeName!.length).toBeGreaterThan(0);
    }
  });

  it('common snake_case column names round-trip correctly', () => {
    const commonNames = [
      'id', 'database_id', 'schema_id', 'table_id', 'field_id',
      'name', 'type', 'description', 'is_public', 'role_name',
      'og_image', 'apple_touch_icon', 'sign_in_function',
      'sign_in_cross_origin_function', 'one_time_token_function',
      'created_at', 'updated_at', 'foreign_key_constraint',
      'ref_table_id', 'ref_field_ids', 'delete_action',
      'smart_tags', 'api_id', 'site_id', 'app_image',
      'app_store_link', 'play_store_link'
    ];

    const failures: string[] = [];
    for (const name of commonNames) {
      const camel = toCamelCase(name);
      const roundTrip = toSnakeCase(camel);
      if (roundTrip !== name) {
        failures.push(`"${name}" → "${camel}" → "${roundTrip}"`);
      }
    }

    expect(failures).toEqual([]);
  });
});

// =============================================================================
// mapPgTypeToFieldType unit tests
// =============================================================================

describe('mapPgTypeToFieldType', () => {
  it('maps uuid types correctly', () => {
    expect(mapPgTypeToFieldType('uuid')).toBe('uuid');
    expect(mapPgTypeToFieldType('_uuid')).toBe('uuid[]');
  });

  it('maps text types correctly', () => {
    expect(mapPgTypeToFieldType('text')).toBe('text');
    expect(mapPgTypeToFieldType('varchar')).toBe('text');
    expect(mapPgTypeToFieldType('bpchar')).toBe('text');
    expect(mapPgTypeToFieldType('name')).toBe('text');
    expect(mapPgTypeToFieldType('citext')).toBe('text');
    expect(mapPgTypeToFieldType('_text')).toBe('text[]');
    expect(mapPgTypeToFieldType('_varchar')).toBe('text[]');
    expect(mapPgTypeToFieldType('_citext')).toBe('text[]');
  });

  it('maps boolean type correctly', () => {
    expect(mapPgTypeToFieldType('bool')).toBe('boolean');
  });

  it('maps json types correctly', () => {
    expect(mapPgTypeToFieldType('jsonb')).toBe('jsonb');
    expect(mapPgTypeToFieldType('json')).toBe('jsonb');
    expect(mapPgTypeToFieldType('_jsonb')).toBe('jsonb[]');
  });

  it('maps integer types correctly', () => {
    expect(mapPgTypeToFieldType('int2')).toBe('int');
    expect(mapPgTypeToFieldType('int4')).toBe('int');
    expect(mapPgTypeToFieldType('int8')).toBe('int');
    expect(mapPgTypeToFieldType('numeric')).toBe('int');
  });

  it('maps temporal types correctly', () => {
    expect(mapPgTypeToFieldType('interval')).toBe('interval');
    expect(mapPgTypeToFieldType('timestamptz')).toBe('timestamptz');
    expect(mapPgTypeToFieldType('timestamp')).toBe('timestamptz');
  });

  it('falls back to text for unknown types', () => {
    expect(mapPgTypeToFieldType('geometry')).toBe('text');
    expect(mapPgTypeToFieldType('unknown_array')).toBe('text');
  });
});

// =============================================================================
// mapGraphQLTypeToFieldType unit tests
// =============================================================================

describe('mapGraphQLTypeToFieldType', () => {
  it('maps scalar types correctly', () => {
    expect(mapGraphQLTypeToFieldType('UUID', false)).toBe('uuid');
    expect(mapGraphQLTypeToFieldType('ID', false)).toBe('uuid');
    expect(mapGraphQLTypeToFieldType('String', false)).toBe('text');
    expect(mapGraphQLTypeToFieldType('Boolean', false)).toBe('boolean');
    expect(mapGraphQLTypeToFieldType('Int', false)).toBe('int');
    expect(mapGraphQLTypeToFieldType('BigInt', false)).toBe('int');
    expect(mapGraphQLTypeToFieldType('BigFloat', false)).toBe('int');
    expect(mapGraphQLTypeToFieldType('Float', false)).toBe('int');
    expect(mapGraphQLTypeToFieldType('JSON', false)).toBe('jsonb');
    expect(mapGraphQLTypeToFieldType('Interval', false)).toBe('interval');
    expect(mapGraphQLTypeToFieldType('Datetime', false)).toBe('timestamptz');
  });

  it('maps list types to array FieldTypes', () => {
    expect(mapGraphQLTypeToFieldType('UUID', true)).toBe('uuid[]');
    expect(mapGraphQLTypeToFieldType('String', true)).toBe('text[]');
    expect(mapGraphQLTypeToFieldType('JSON', true)).toBe('jsonb[]');
  });

  it('falls back to text for unsupported list types', () => {
    expect(mapGraphQLTypeToFieldType('Boolean', true)).toBe('text');
    expect(mapGraphQLTypeToFieldType('Int', true)).toBe('text');
  });

  it('falls back to text for unknown types', () => {
    expect(mapGraphQLTypeToFieldType('SomeUnknownType', false)).toBe('text');
  });
});

// =============================================================================
// unwrapGraphQLType unit tests
// =============================================================================

describe('unwrapGraphQLType', () => {
  it('unwraps a named type', () => {
    const result = unwrapGraphQLType({ name: 'UUID', kind: 'SCALAR' });
    expect(result).toEqual({ typeName: 'UUID', kind: 'SCALAR', nonNull: false, list: false });
  });

  it('unwraps NON_NULL wrapper', () => {
    const result = unwrapGraphQLType({
      name: null,
      kind: 'NON_NULL',
      ofType: { name: 'UUID', kind: 'SCALAR' }
    });
    expect(result).toEqual({ typeName: 'UUID', kind: 'SCALAR', nonNull: true, list: false });
  });

  it('unwraps LIST wrapper', () => {
    const result = unwrapGraphQLType({
      name: null,
      kind: 'LIST',
      ofType: { name: 'UUID', kind: 'SCALAR' }
    });
    expect(result).toEqual({ typeName: 'UUID', kind: 'SCALAR', nonNull: false, list: true });
  });

  it('unwraps NON_NULL(LIST(UUID)) — typical PostGraphile [UUID!]! pattern', () => {
    const result = unwrapGraphQLType({
      name: null,
      kind: 'NON_NULL',
      ofType: {
        name: null,
        kind: 'LIST',
        ofType: { name: 'UUID', kind: 'SCALAR' }
      }
    });
    // The leaf type is UUID, its immediate parent is LIST, so list=true.
    // nonNull tracks the immediate parent kind of the leaf type, not the outermost wrapper.
    expect(result).toEqual({ typeName: 'UUID', kind: 'SCALAR', nonNull: false, list: true });
  });

  it('returns Unknown for null type ref', () => {
    const result = unwrapGraphQLType(null);
    expect(result).toEqual({ typeName: 'Unknown', kind: 'UNKNOWN', nonNull: false, list: false });
  });

  it('returns Unknown for empty ofType chain', () => {
    const result = unwrapGraphQLType({ name: null, kind: null, ofType: null });
    expect(result).toEqual({ typeName: 'Unknown', kind: 'UNKNOWN', nonNull: false, list: false });
  });
});

// =============================================================================
// getGraphQLTypeName unit tests
// =============================================================================

describe('getGraphQLTypeName', () => {
  it('derives PascalCase singular type names from snake_case table names', () => {
    expect(getGraphQLTypeName('database')).toBe('Database');
    expect(getGraphQLTypeName('schema')).toBe('Schema');
    expect(getGraphQLTypeName('foreign_key_constraint')).toBe('ForeignKeyConstraint');
    expect(getGraphQLTypeName('user_auth_module')).toBe('UserAuthModule');
    expect(getGraphQLTypeName('rls_function')).toBe('RlsFunction');
  });
});

// =============================================================================
// typeOverrides precedence test (logic-level, no DB needed)
// =============================================================================

describe('typeOverrides should take precedence over introspected types', () => {
  it('META_TABLE_CONFIG entries with typeOverrides have correct override field types', () => {
    // sites has typeOverrides for og_image, favicon, apple_touch_icon, logo
    const sites = META_TABLE_CONFIG.sites;
    expect(sites.typeOverrides).toBeDefined();
    expect(sites.typeOverrides!.og_image).toBe('image');
    expect(sites.typeOverrides!.favicon).toBe('upload');
    expect(sites.typeOverrides!.apple_touch_icon).toBe('image');
    expect(sites.typeOverrides!.logo).toBe('image');

    // apps has typeOverrides for app_image, app_store_link, play_store_link
    const apps = META_TABLE_CONFIG.apps;
    expect(apps.typeOverrides).toBeDefined();
    expect(apps.typeOverrides!.app_image).toBe('image');
    expect(apps.typeOverrides!.app_store_link).toBe('url');
    expect(apps.typeOverrides!.play_store_link).toBe('url');

    // site_metadata has typeOverrides for og_image
    const siteMetadata = META_TABLE_CONFIG.site_metadata;
    expect(siteMetadata.typeOverrides).toBeDefined();
    expect(siteMetadata.typeOverrides!.og_image).toBe('image');
  });

  it('tables without typeOverrides should have no typeOverrides key', () => {
    const database = META_TABLE_CONFIG.database;
    expect(database.typeOverrides).toBeUndefined();

    const field = META_TABLE_CONFIG.field;
    expect(field.typeOverrides).toBeUndefined();
  });

  it('columnDefaults should be set for tables with environment-specific columns', () => {
    // apis.dbname defaults to current_database() and must not be exported
    // as a hardcoded literal — see constructive-db commit 348a5b402e.
    const apis = META_TABLE_CONFIG.apis;
    expect(apis.columnDefaults).toBeDefined();
    expect(apis.columnDefaults!.dbname).toBe('current_database()');

    // sites.dbname has the same portability issue
    const sites = META_TABLE_CONFIG.sites;
    expect(sites.columnDefaults).toBeDefined();
    expect(sites.columnDefaults!.dbname).toBe('current_database()');
  });

  it('tables without columnDefaults should have no columnDefaults key', () => {
    const database = META_TABLE_CONFIG.database;
    expect(database.columnDefaults).toBeUndefined();

    const domains = META_TABLE_CONFIG.domains;
    expect(domains.columnDefaults).toBeUndefined();
  });
});

// =============================================================================
// GraphQL type name derivation for all META_TABLE_CONFIG entries
// =============================================================================

describe('GraphQL type name derivation for all config entries', () => {
  it('every META_TABLE_CONFIG entry should produce a non-empty GraphQL type name', () => {
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      const typeName = getGraphQLTypeName(config.table);
      expect(typeName.length).toBeGreaterThan(0);
      // Type names should be PascalCase (start with uppercase)
      expect(typeName[0]).toBe(typeName[0].toUpperCase());
    }
  });

  it('every META_TABLE_CONFIG entry should produce a non-empty GraphQL query name', () => {
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      const queryName = getGraphQLQueryName(config.table);
      expect(queryName.length).toBeGreaterThan(0);
      // Query names should be camelCase (start with lowercase)
      expect(queryName[0]).toBe(queryName[0].toLowerCase());
    }
  });
});
