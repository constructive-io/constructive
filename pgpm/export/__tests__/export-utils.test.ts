/**
 * Unit tests for export-utils.ts
 * 
 * Validates consistency between META_TABLE_CONFIG, META_TABLE_ORDER,
 * and the queryAndParse calls in both export-meta.ts and export-graphql-meta.ts.
 * Also tests shared utility functions.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import path from 'path';

import {
  META_TABLE_CONFIG,
  META_TABLE_ORDER,
  DB_REQUIRED_EXTENSIONS,
  SERVICE_REQUIRED_EXTENSIONS,
  META_COMMON_HEADER,
  META_COMMON_FOOTER,
  makeReplacer,
  normalizeOutdir
} from '../src/export-utils';

// =============================================================================
// Config / Order consistency
// =============================================================================

describe('META_TABLE_CONFIG and META_TABLE_ORDER consistency', () => {
  it('every key in META_TABLE_ORDER should exist in META_TABLE_CONFIG', () => {
    const configKeys = new Set(Object.keys(META_TABLE_CONFIG));
    const missingFromConfig: string[] = [];

    for (const tableName of META_TABLE_ORDER) {
      if (!configKeys.has(tableName)) {
        missingFromConfig.push(tableName);
      }
    }

    expect(missingFromConfig).toEqual([]);
  });

  it('every key in META_TABLE_CONFIG should exist in META_TABLE_ORDER (no orphaned configs)', () => {
    const orderSet = new Set<string>(META_TABLE_ORDER as unknown as string[]);
    const configKeys = Object.keys(META_TABLE_CONFIG);
    const missingFromOrder: string[] = [];

    for (const key of configKeys) {
      if (!orderSet.has(key)) {
        missingFromOrder.push(key);
      }
    }

    // database_extension is in config but intentionally not in META_TABLE_ORDER
    // (it's queried but not included in the meta package output)
    // If there are other exceptions, document them here.
    const knownExceptions = ['database_extension'];
    const unexpectedMissing = missingFromOrder.filter(k => !knownExceptions.includes(k));

    expect(unexpectedMissing).toEqual([]);
  });

  it('META_TABLE_ORDER should not have duplicates', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const name of META_TABLE_ORDER) {
      if (seen.has(name)) {
        duplicates.push(name);
      }
      seen.add(name);
    }

    expect(duplicates).toEqual([]);
  });

  it('every config entry should have a valid schema', () => {
    const validSchemas = ['metaschema_public', 'services_public', 'metaschema_modules_public'];

    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      expect(validSchemas).toContain(config.schema);
      expect(config.table).toBeTruthy();
      expect(Object.keys(config.fields).length).toBeGreaterThan(0);
    }
  });

  it('every config entry should have an id field of type uuid', () => {
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      expect(config.fields).toHaveProperty('id');
      expect(config.fields.id).toBe('uuid');
    }
  });

  it('every config entry (except database) should have a database_id field', () => {
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      if (key === 'database') continue;
      expect(config.fields).toHaveProperty('database_id');
      expect(config.fields.database_id).toBe('uuid');
    }
  });
});

// =============================================================================
// Cross-flow table parity: export-meta.ts and export-graphql-meta.ts
// must query exactly the same set of tables
// =============================================================================

describe('SQL and GraphQL flow table parity', () => {
  let sqlFlowTables: string[];
  let graphqlFlowTables: string[];

  beforeAll(() => {
    // Extract queryAndParse keys from export-meta.ts
    const sqlSource = readFileSync(
      join(__dirname, '../src/export-meta.ts'),
      'utf-8'
    );
    sqlFlowTables = [...sqlSource.matchAll(/queryAndParse\('(\w+)'/g)].map(m => m[1]);

    // Extract queryAndParse keys from export-graphql-meta.ts
    const gqlSource = readFileSync(
      join(__dirname, '../src/export-graphql-meta.ts'),
      'utf-8'
    );
    graphqlFlowTables = [...gqlSource.matchAll(/queryAndParse\('(\w+)'/g)].map(m => m[1]);
  });

  it('both flows should query the same set of tables', () => {
    const sqlSet = new Set(sqlFlowTables);
    const gqlSet = new Set(graphqlFlowTables);

    const inSqlNotGql = sqlFlowTables.filter(t => !gqlSet.has(t));
    const inGqlNotSql = graphqlFlowTables.filter(t => !sqlSet.has(t));

    expect(inSqlNotGql).toEqual([]);
    expect(inGqlNotSql).toEqual([]);
  });

  it('all queried tables should have entries in META_TABLE_CONFIG', () => {
    const configKeys = new Set(Object.keys(META_TABLE_CONFIG));

    const sqlMissing = sqlFlowTables.filter(t => !configKeys.has(t));
    const gqlMissing = graphqlFlowTables.filter(t => !configKeys.has(t));

    expect(sqlMissing).toEqual([]);
    expect(gqlMissing).toEqual([]);
  });

  it('every key in META_TABLE_CONFIG should be queried by both flows', () => {
    const sqlSet = new Set(sqlFlowTables);
    const gqlSet = new Set(graphqlFlowTables);
    const configKeys = Object.keys(META_TABLE_CONFIG);

    const notQueriedBySql = configKeys.filter(k => !sqlSet.has(k));
    const notQueriedByGql = configKeys.filter(k => !gqlSet.has(k));

    expect(notQueriedBySql).toEqual([]);
    expect(notQueriedByGql).toEqual([]);
  });
});

// =============================================================================
// Shared constants
// =============================================================================

describe('Shared constants', () => {
  it('DB_REQUIRED_EXTENSIONS should include core PostgreSQL extensions', () => {
    const expected = ['plpgsql', 'uuid-ossp', 'citext', 'pgcrypto', 'btree_gin', 'btree_gist', 'postgis', 'hstore', 'vector'];
    for (const ext of expected) {
      expect(DB_REQUIRED_EXTENSIONS).toContain(ext);
    }
  });

  it('SERVICE_REQUIRED_EXTENSIONS should include metaschema dependencies', () => {
    expect(SERVICE_REQUIRED_EXTENSIONS).toContain('plpgsql');
    expect(SERVICE_REQUIRED_EXTENSIONS).toContain('metaschema-schema');
    expect(SERVICE_REQUIRED_EXTENSIONS).toContain('services');
  });

  it('META_COMMON_HEADER should set session_replication_role', () => {
    expect(META_COMMON_HEADER).toContain('session_replication_role');
  });

  it('META_COMMON_FOOTER should reset session_replication_role', () => {
    expect(META_COMMON_FOOTER).toContain('session_replication_role');
    expect(META_COMMON_FOOTER).toContain('DEFAULT');
  });
});

// =============================================================================
// normalizeOutdir
// =============================================================================

describe('normalizeOutdir', () => {
  it('should add trailing separator if missing', () => {
    const result = normalizeOutdir('/some/path');
    expect(result).toBe(`/some/path${path.sep}`);
  });

  it('should not double-add trailing separator', () => {
    const result = normalizeOutdir(`/some/path${path.sep}`);
    expect(result).toBe(`/some/path${path.sep}`);
  });

  it('should handle empty string', () => {
    const result = normalizeOutdir('');
    expect(result).toBe(path.sep);
  });
});

// =============================================================================
// makeReplacer
// =============================================================================

describe('makeReplacer', () => {
  it('should replace schema names with snake_case prefixed versions', () => {
    const { replacer } = makeReplacer({
      schemas: [
        { name: 'public', schema_name: 'pets_public' },
        { name: 'private', schema_name: 'pets_private' }
      ],
      name: 'my-extension'
    });

    expect(replacer('pets_public')).toBe('my_extension_public');
    expect(replacer('pets_private')).toBe('my_extension_private');
  });

  it('should replace the extension name placeholder', () => {
    const { replacer } = makeReplacer({
      schemas: [],
      name: 'my-extension'
    });

    expect(replacer('constructive-extension-name')).toBe('my-extension');
  });

  it('should handle multiple replacements in one string', () => {
    const { replacer } = makeReplacer({
      schemas: [
        { name: 'public', schema_name: 'pets_public' }
      ],
      name: 'my-ext'
    });

    const input = 'SELECT * FROM pets_public.users WHERE constructive-extension-name = true';
    const result = replacer(input);
    expect(result).toContain('my_ext_public');
    expect(result).toContain('my-ext');
    expect(result).not.toContain('pets_public');
    expect(result).not.toContain('constructive-extension-name');
  });

  it('should return empty string for empty/falsy input', () => {
    const { replacer } = makeReplacer({ schemas: [], name: 'test' });
    expect(replacer('')).toBe('');
  });

  it('should use schemaPrefix when provided instead of name for schema replacement', () => {
    const { replacer } = makeReplacer({
      schemas: [
        { name: 'auth_public', schema_name: 'pets_auth_public' }
      ],
      name: 'pets-services',
      schemaPrefix: 'pets'
    });

    // Schema replacement should use the schemaPrefix, not name
    expect(replacer('pets_auth_public')).toBe('pets_auth_public');
  });

  it('should return replace array with correct length', () => {
    const { replace } = makeReplacer({
      schemas: [
        { name: 'public', schema_name: 'pets_public' },
        { name: 'private', schema_name: 'pets_private' }
      ],
      name: 'my-ext'
    });

    // 2 schema replacements + 1 extension name replacement
    expect(replace).toHaveLength(3);
    expect(replace[0][0]).toBeInstanceOf(RegExp);
    expect(typeof replace[0][1]).toBe('string');
  });
});
