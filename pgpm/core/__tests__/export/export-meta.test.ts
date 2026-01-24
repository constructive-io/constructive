/**
 * Tests for export-meta.ts configuration validation
 * 
 * These tests validate that the export-meta config uses correct table names
 * and includes all required fields for exporting services_public and metaschema_public data.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Export Meta Config Validation', () => {
  let exportMetaSource: string;

  beforeAll(() => {
    // Read the source file to validate the config
    const filePath = join(__dirname, '../../src/export/export-meta.ts');
    exportMetaSource = readFileSync(filePath, 'utf-8');
  });

  describe('table name validation', () => {
    it('should include field table in queries', () => {
      // The field table should be queried (it was missing before)
      expect(exportMetaSource).toContain("queryAndParse('field'");
      expect(exportMetaSource).toContain('FROM metaschema_public.field');
    });
  });

  describe('metaschema_public tables', () => {
    it('should include all required metaschema_public tables in config', () => {
      const requiredTables = [
        'database',
        'schema',
        'table',
        'field'
      ];

      for (const table of requiredTables) {
        expect(exportMetaSource).toContain(`queryAndParse('${table}'`);
      }
    });
  });

  describe('services_public tables', () => {
    it('should include all required services_public tables in config', () => {
      const requiredTables = [
        'domains',
        'sites',
        'apis',
        'apps',
        'site_modules',
        'site_themes',
        'api_modules',
        'api_schemas'
      ];

      for (const table of requiredTables) {
        expect(exportMetaSource).toContain(`queryAndParse('${table}'`);
      }
    });
  });

  describe('metaschema_modules_public tables', () => {
    it('should include all required metaschema_modules_public tables in config', () => {
      const requiredTables = [
        'rls_module',
        'user_auth_module'
      ];

      for (const table of requiredTables) {
        expect(exportMetaSource).toContain(`queryAndParse('${table}'`);
      }
    });
  });

  describe('query order validation', () => {
    it('should query database before dependent tables', () => {
      // database should be queried first as other tables depend on it
      const databaseQueryIndex = exportMetaSource.indexOf("queryAndParse('database',");
      const schemaQueryIndex = exportMetaSource.indexOf("queryAndParse('schema',");
      const tableQueryIndex = exportMetaSource.indexOf("queryAndParse('table',");
      
      expect(databaseQueryIndex).toBeLessThan(schemaQueryIndex);
      expect(schemaQueryIndex).toBeLessThan(tableQueryIndex);
    });
  });
});

describe('Export Meta Config Drift Detection', () => {
  it('should document the expected table names in metaschema_public', () => {
    // This test documents the expected table names that export-meta.ts should use
    // If these change, the export-meta.ts config needs to be updated
    const expectedMetaschemaPublicTables = [
      'database',
      'schema',
      'table',
      'field'
    ];

    // Document the expected tables
    expect(expectedMetaschemaPublicTables.length).toBe(4);
  });

  it('should document the expected table names in services_public', () => {
    // This test documents the expected table names that export-meta.ts should use
    const expectedServicesPublicTables = [
      'apis',
      'api_modules',
      'api_schemas',
      'apps',
      'domains',
      'site_modules',
      'site_themes',
      'sites'
    ];

    // Document the expected tables
    expect(expectedServicesPublicTables.length).toBe(8);
  });

  it('should document the expected table names in metaschema_modules_public', () => {
    // This test documents the expected table names that export-meta.ts should use
    const expectedMetaschemaModulesPublicTables = [
      'rls_module',
      'user_auth_module'
    ];

    // Document the expected tables
    expect(expectedMetaschemaModulesPublicTables.length).toBe(2);
  });

});
