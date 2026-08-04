/**
 * Tests for export-meta.ts configuration validation
 * 
 * These tests validate that META_TABLE_CONFIG uses correct table names,
 * schema groupings, and field definitions for exporting metaschema_public,
 * routing_public, apps_public, and
 * metaschema_modules_public data.
 * 
 * Uses actual imports instead of string-matching source files.
 */

import { META_TABLE_CONFIG, META_TABLE_ORDER } from '../src/export-utils';

describe('Export Meta Config Validation', () => {
  describe('metaschema_public tables', () => {
    const required = [
      'database', 'schema', 'table', 'field',
      'policy', 'index', 'trigger', 'trigger_function',
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

  describe('routing_public tables', () => {
    const required = [
      'domains', 'sites', 'apis',
      'site_modules', 'site_themes', 'site_metadata',
      'api_schemas'
    ];

    it('should include all required routing_public tables in config', () => {
      for (const table of required) {
        expect(META_TABLE_CONFIG).toHaveProperty(table);
        expect(META_TABLE_CONFIG[table].schema).toBe('routing_public');
      }
    });
  });

  describe('apps_public tables', () => {
    it('should include apps in config', () => {
      expect(META_TABLE_CONFIG).toHaveProperty('apps');
      expect(META_TABLE_CONFIG.apps.schema).toBe('apps_public');
    });
  });

  describe('metaschema_modules_public tables', () => {
    const required = [
      'rls_module', 'user_auth_module', 'memberships_module',
      'permissions_module', 'limits_module',
      'events_module',
      'users_module', 'hierarchy_module', 'membership_types_module',
      'invites_module', 'emails_module', 'sessions_module',
      'user_state_module', 'profiles_module', 'config_secrets_user_module',
      'user_credentials_module', 'user_settings_module',
      'connected_accounts_module', 'phone_numbers_module',
      'crypto_addresses_module', 'crypto_auth_module',
      'secure_table_provision', 'default_ids_module',
      'denormalized_table_field',
      'relation_provision', 'entity_type_provision',
      'rate_limits_module', 'storage_module',
      'billing_module', 'billing_provider_module',
      'devices_module', 'identity_providers_module',
      'notifications_module', 'plans_module',
      'realtime_module', 'session_secrets_module',
      'infra_secrets_module', 'infra_config_module',
      'internal_secrets_module',
      'i18n_module', 'agent_module',
      'function_module', 'namespace_module',
      'merkle_store_module', 'graph_module',
      'compute_log_module', 'db_usage_module',
      'storage_log_module', 'transfer_log_module',
      'webauthn_auth_module', 'webauthn_credentials_module',
      'inference_log_module', 'rate_limit_meters_module',
      'catalog_module', 'domain_module', 'api_surface_module',
      'site_surface_module', 'route_module', 'app_module',
      'database_settings_module'
    ];

    it('should include all required metaschema_modules_public tables in config', () => {
      for (const table of required) {
        expect(META_TABLE_CONFIG).toHaveProperty(table);
        expect(META_TABLE_CONFIG[table].schema).toBe('metaschema_modules_public');
      }
    });
  });

  describe('surface module dependency order', () => {
    it('catalog_module should come before the modules that reference it', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const catalogIdx = order.indexOf('catalog_module');

      expect(catalogIdx).toBeGreaterThanOrEqual(0);
      for (const table of ['domain_module', 'api_surface_module', 'site_surface_module', 'app_module', 'route_module']) {
        expect(catalogIdx).toBeLessThan(order.indexOf(table));
      }
    });

    it('domain_module should come before route_module', () => {
      const order = META_TABLE_ORDER as unknown as string[];

      expect(order.indexOf('domain_module')).toBeLessThan(order.indexOf('route_module'));
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

    it('metaschema_public tables should come before scoped plane tables', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const lastMetaschema = order.indexOf('default_privilege');
      const firstService = order.indexOf('domains');

      expect(lastMetaschema).toBeLessThan(firstService);
    });

    it('metaschema_modules_public tables should come before scoped plane tables', () => {
      const order = META_TABLE_ORDER as unknown as string[];
      const lastModule = order.indexOf('rls_module');
      const firstScoped = order.indexOf('apis');

      expect(lastModule).toBeLessThan(firstScoped);
    });
  });
});
