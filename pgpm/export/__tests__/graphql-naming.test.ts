/**
 * Unit tests for graphql-naming.ts
 * 
 * Tests the mapping layer between PostgreSQL names and PostGraphile GraphQL names.
 * These functions are critical for the GraphQL export flow — if naming is wrong,
 * queries silently return empty data or the csv-to-pg Parser receives wrong keys.
 */

import {
  getGraphQLQueryName,
  graphqlRowToPostgresRow,
  intervalToPostgres,
  buildFieldsFragment
} from '../src/graphql-naming';

describe('getGraphQLQueryName', () => {
  it('should convert simple table names to pluralized camelCase', () => {
    expect(getGraphQLQueryName('database')).toBe('databases');
    expect(getGraphQLQueryName('schema')).toBe('schemas');
    expect(getGraphQLQueryName('table')).toBe('tables');
    expect(getGraphQLQueryName('field')).toBe('fields');
    expect(getGraphQLQueryName('policy')).toBe('policies');
    expect(getGraphQLQueryName('index')).toBe('indices');
    expect(getGraphQLQueryName('trigger')).toBe('triggers');
  });

  it('should convert snake_case compound names', () => {
    expect(getGraphQLQueryName('trigger_function')).toBe('triggerFunctions');
    expect(getGraphQLQueryName('rls_function')).toBe('rlsFunctions');
    expect(getGraphQLQueryName('foreign_key_constraint')).toBe('foreignKeyConstraints');
    expect(getGraphQLQueryName('primary_key_constraint')).toBe('primaryKeyConstraints');
    expect(getGraphQLQueryName('unique_constraint')).toBe('uniqueConstraints');
    expect(getGraphQLQueryName('check_constraint')).toBe('checkConstraints');
    expect(getGraphQLQueryName('full_text_search')).toBe('fullTextSearches');
  });

  it('should convert services_public table names', () => {
    expect(getGraphQLQueryName('domains')).toBe('domains');
    expect(getGraphQLQueryName('sites')).toBe('sites');
    expect(getGraphQLQueryName('apis')).toBe('apis');
    expect(getGraphQLQueryName('apps')).toBe('apps');
    expect(getGraphQLQueryName('site_modules')).toBe('siteModules');
    expect(getGraphQLQueryName('site_themes')).toBe('siteThemes');
    expect(getGraphQLQueryName('site_metadata')).toBe('siteMetadata');
    expect(getGraphQLQueryName('api_modules')).toBe('apiModules');
    expect(getGraphQLQueryName('api_extensions')).toBe('apiExtensions');
    expect(getGraphQLQueryName('api_schemas')).toBe('apiSchemas');
  });

  it('should convert grant/privilege table names', () => {
    expect(getGraphQLQueryName('schema_grant')).toBe('schemaGrants');
    expect(getGraphQLQueryName('table_grant')).toBe('tableGrants');
    expect(getGraphQLQueryName('default_privilege')).toBe('defaultPrivileges');
  });

  it('should convert metaschema_modules_public table names', () => {
    expect(getGraphQLQueryName('rls_module')).toBe('rlsModules');
    expect(getGraphQLQueryName('user_auth_module')).toBe('userAuthModules');
    expect(getGraphQLQueryName('memberships_module')).toBe('membershipsModules');
    expect(getGraphQLQueryName('permissions_module')).toBe('permissionsModules');
    expect(getGraphQLQueryName('limits_module')).toBe('limitsModules');
    expect(getGraphQLQueryName('levels_module')).toBe('levelsModules');
    expect(getGraphQLQueryName('users_module')).toBe('usersModules');
    expect(getGraphQLQueryName('hierarchy_module')).toBe('hierarchyModules');
    expect(getGraphQLQueryName('sessions_module')).toBe('sessionsModules');
    expect(getGraphQLQueryName('secrets_module')).toBe('secretsModules');
    expect(getGraphQLQueryName('profiles_module')).toBe('profilesModules');
    expect(getGraphQLQueryName('encrypted_secrets_module')).toBe('encryptedSecretsModules');
    expect(getGraphQLQueryName('connected_accounts_module')).toBe('connectedAccountsModules');
    expect(getGraphQLQueryName('phone_numbers_module')).toBe('phoneNumbersModules');
    expect(getGraphQLQueryName('crypto_addresses_module')).toBe('cryptoAddressesModules');
    expect(getGraphQLQueryName('crypto_auth_module')).toBe('cryptoAuthModules');
    expect(getGraphQLQueryName('field_module')).toBe('fieldModules');
    expect(getGraphQLQueryName('table_module')).toBe('tableModules');
    expect(getGraphQLQueryName('table_template_module')).toBe('tableTemplateModules');
    expect(getGraphQLQueryName('secure_table_provision')).toBe('secureTableProvisions');
    expect(getGraphQLQueryName('uuid_module')).toBe('uuidModules');
    expect(getGraphQLQueryName('default_ids_module')).toBe('defaultIdsModules');
    expect(getGraphQLQueryName('denormalized_table_field')).toBe('denormalizedTableFields');
  });

  it('should convert db_migrate table names', () => {
    expect(getGraphQLQueryName('sql_actions')).toBe('sqlActions');
  });

  it('should convert database_extension', () => {
    expect(getGraphQLQueryName('database_extension')).toBe('databaseExtensions');
  });
});

describe('graphqlRowToPostgresRow', () => {
  it('should convert camelCase keys to snake_case', () => {
    const input = {
      id: '123',
      databaseId: '456',
      schemaId: '789',
      fieldIds: ['a', 'b'],
      isPublic: true
    };
    const result = graphqlRowToPostgresRow(input);
    expect(result).toEqual({
      id: '123',
      database_id: '456',
      schema_id: '789',
      field_ids: ['a', 'b'],
      is_public: true
    });
  });

  it('should handle single-word keys (no transformation needed)', () => {
    const input = { id: '123', name: 'test', type: 'uuid' };
    const result = graphqlRowToPostgresRow(input);
    expect(result).toEqual({ id: '123', name: 'test', type: 'uuid' });
  });

  it('should preserve null values', () => {
    const input: Record<string, unknown> = { id: '123', databaseId: null, name: null };
    const result = graphqlRowToPostgresRow(input);
    expect(result).toEqual({ id: '123', database_id: null, name: null });
  });

  it('should preserve nested objects (JSONB) without transforming their keys', () => {
    const input = {
      id: '123',
      data: { someNestedKey: 'value', anotherKey: { deep: true } }
    };
    const result = graphqlRowToPostgresRow(input);
    expect(result.data).toEqual({ someNestedKey: 'value', anotherKey: { deep: true } });
  });

  it('should handle empty objects', () => {
    expect(graphqlRowToPostgresRow({})).toEqual({});
  });

  it('should convert compound field names from the meta config', () => {
    const input = {
      refTableId: 'abc',
      refFieldIds: ['x', 'y'],
      deleteAction: 'CASCADE',
      updateAction: 'NO ACTION',
      smartTags: { tag: true }
    };
    const result = graphqlRowToPostgresRow(input);
    expect(result).toEqual({
      ref_table_id: 'abc',
      ref_field_ids: ['x', 'y'],
      delete_action: 'CASCADE',
      update_action: 'NO ACTION',
      smart_tags: { tag: true }
    });
  });
});

describe('intervalToPostgres', () => {
  it('should return null for null input', () => {
    expect(intervalToPostgres(null)).toBeNull();
  });

  it('should convert hours/minutes/seconds to HH:MM:SS format', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 0, hours: 1, minutes: 30, seconds: 0 });
    expect(result).toBe('1:30:00');
  });

  it('should convert minutes only', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 0, hours: 0, minutes: 45, seconds: 0 });
    expect(result).toBe('00:45:00');
  });

  it('should convert seconds only', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 30 });
    expect(result).toBe('00:00:30');
  });

  it('should convert days', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 7, hours: 0, minutes: 0, seconds: 0 });
    expect(result).toBe('7 days');
  });

  it('should convert years and months', () => {
    const result = intervalToPostgres({ years: 1, months: 6, days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(result).toBe('1 year 6 mons');
  });

  it('should handle composite intervals', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 1, hours: 2, minutes: 30, seconds: 0 });
    expect(result).toBe('1 day 2:30:00');
  });

  it('should return 00:00:00 for all-zero interval', () => {
    const result = intervalToPostgres({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(result).toBe('00:00:00');
  });

  it('should handle null fields within the interval object', () => {
    const result = intervalToPostgres({ years: null, months: null, days: null, hours: 1, minutes: null, seconds: null });
    expect(result).toBe('1:00:00');
  });

  it('should handle singular units', () => {
    const result = intervalToPostgres({ years: 1, months: 1, days: 1, hours: 0, minutes: 0, seconds: 0 });
    expect(result).toBe('1 year 1 mon 1 day');
  });
});

describe('buildFieldsFragment', () => {
  it('should convert snake_case field names to camelCase', () => {
    const result = buildFieldsFragment(['id', 'database_id', 'name']);
    expect(result).toContain('id');
    expect(result).toContain('databaseId');
    expect(result).toContain('name');
  });

  it('should expand interval fields into subfield selections', () => {
    const result = buildFieldsFragment(
      ['id', 'sessions_default_expiration'],
      { id: 'uuid', sessions_default_expiration: 'interval' }
    );
    expect(result).toContain('id');
    expect(result).toContain('sessionsDefaultExpiration { seconds minutes hours days months years }');
  });

  it('should not expand non-interval fields', () => {
    const result = buildFieldsFragment(
      ['id', 'name', 'data'],
      { id: 'uuid', name: 'text', data: 'jsonb' }
    );
    expect(result).not.toContain('{');
  });

  it('should handle empty field list', () => {
    expect(buildFieldsFragment([])).toBe('');
  });

  it('should handle fields without type hints', () => {
    const result = buildFieldsFragment(['id', 'database_id', 'schema_id']);
    expect(result).toContain('id');
    expect(result).toContain('databaseId');
    expect(result).toContain('schemaId');
    expect(result).not.toContain('{');
  });
});
