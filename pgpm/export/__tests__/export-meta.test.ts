/**
 * Tests for export-meta.ts configuration validation
 * 
 * These tests validate that META_TABLE_CONFIG uses correct table names,
 * schema groupings, and field definitions for exporting metaschema_public,
 * services_public, and metaschema_modules_public data.
 * 
 * Uses actual imports instead of string-matching source files.
 */

import { META_TABLE_CONFIG, META_TABLE_ORDER } from '../src/export-utils';

describe('Export Meta Config Validation', () => {
  describe('metaschema_public tables', () => {
    const required = [
      'database', 'database_extension', 'schema', 'table', 'field',
      'policy', 'index', 'trigger', 'trigger_function', 'rls_function',
      'foreign_key_constraint', 'primary_key_constraint', 'unique_constraint',
      'check_constraint', 'full_text_search', 'schema_grant', 'table_grant',
      'default_privilege'
    ];

    it('should include all required metaschema_public tables in config', () => {
      for (const table of required) {
        expect(META_TABLE_CONFIG).toHaveProperty(table);
        expect(META_TABLE_CONFIG[table].schema).toBe('metaschema_public');
      }
    });
  });

  describe('services_public tables', () => {
    const required = [
      'domains', 'sites', 'apis', 'apps',
      'site_modules', 'site_themes', 'site_metadata',
      'api_modules', 'api_extensions', 'api_schemas'
    ];

    it('should include all required services_public tables in config', () => {
      for (const table of required) {
        expect(META_TABLE_CONFIG).toHaveProperty(table);
        expect(META_TABLE_CONFIG[table].schema).toBe('services_public');
      }
    });
  });

  describe('metaschema_modules_public tables', () => {
    const required = [
      'rls_module', 'user_auth_module', 'memberships_module',
      'permissions_module', 'limits_module', 'levels_module',
      'users_module', 'hierarchy_module', 'membership_types_module',
      'invites_module', 'emails_module', 'sessions_module',
      'secrets_module', 'profiles_module', 'encrypted_secrets_module',
      'connected_accounts_module', 'phone_numbers_module',
      'crypto_addresses_module', 'crypto_auth_module',
      'field_module', 'table_module', 'table_template_module',
      'secure_table_provision', 'uuid_module', 'default_ids_module',
      'denormalized_table_field'
    ];

    it('should include all required metaschema_modules_public tables in config', () => {
      for (const table of required) {
        expect(META_TABLE_CONFIG).toHaveProperty(table);
        expect(META_TABLE_CONFIG[table].schema).toBe('metaschema_modules_public');
      }
    });
  });

  describe('table order validation', () => {
    it('database should appear before schema in META_TABLE_ORDER', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const dbIdx = order.indexOf('database');
      const schemaIdx = order.indexOf('schema');
      const tableIdx = order.indexOf('table');
      const fieldIdx = order.indexOf('field');

      expect(dbIdx).toBeGreaterThanOrEqual(0);
      expect(dbIdx).toBeLessThan(schemaIdx);
      expect(schemaIdx).toBeLessThan(tableIdx);
      expect(tableIdx).toBeLessThan(fieldIdx);
    });

    it('metaschema_public tables should come before services_public tables', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const lastMetaschema = order.indexOf('default_privilege');
      const firstService = order.indexOf('domains');

      expect(lastMetaschema).toBeLessThan(firstService);
    });

    it('services_public tables should come before metaschema_modules_public tables', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const lastService = order.indexOf('api_schemas');
      const firstModule = order.indexOf('rls_module');

      expect(lastService).toBeLessThan(firstModule);
    });
  });
});
