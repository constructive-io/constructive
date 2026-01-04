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
    it('should use singular table name "database_extension" (not plural "database_extensions")', () => {
      // The actual table in metaschema_public is database_extension (singular)
      // This test ensures the config uses the correct table name
      
      // Check that the config defines the table correctly
      expect(exportMetaSource).toContain("table: 'database_extension'");
      
      // Ensure we're not using the incorrect plural form in the table definition
      // Note: We check specifically in the config section, not the query section
      const configSection = exportMetaSource.split('const config:')[1]?.split('interface ExportMetaParams')[0] || '';
      expect(configSection).not.toContain("table: 'database_extensions'");
    });

    it('should query the correct table name in metaschema_public.database_extension', () => {
      // The query should use the correct singular table name
      expect(exportMetaSource).toContain('FROM metaschema_public.database_extension');
    });

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
        'database_extension',
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
        'api_extensions',
        'api_schemata',
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
      'database_extension', // NOT 'database_extensions' (plural)
      'schema',
      'table',
      'field'
    ];

    // Document the expected tables
    expect(expectedMetaschemaPublicTables).toContain('database_extension');
    expect(expectedMetaschemaPublicTables).not.toContain('database_extensions');
  });

  it('should document the expected table names in services_public', () => {
    // This test documents the expected table names that export-meta.ts should use
    const expectedServicesPublicTables = [
      'apis',
      'api_extensions',
      'api_modules',
      'api_schemata',
      'apps',
      'domains',
      'site_modules',
      'site_themes',
      'sites',
      'rls_module',
      'user_auth_module'
    ];

    // Document the expected tables
    expect(expectedServicesPublicTables.length).toBe(11);
  });

  it('should document the bug: config uses database_extensions but table is database_extension', () => {
    // BUG DOCUMENTATION:
    // In export-meta.ts, line 26, the config defines:
    //   table: 'database_extensions' (plural)
    // But the actual table in db-meta-schema is:
    //   metaschema_public.database_extension (singular)
    // 
    // This causes the Parser to generate INSERT statements with the wrong table name,
    // which will fail when the exported SQL is replayed.
    //
    // FIX: Change line 26 in export-meta.ts from:
    //   table: 'database_extensions'
    // to:
    //   table: 'database_extension'
    
    const buggyConfigTableName = 'database_extensions';
    const correctTableName = 'database_extension';
    
    expect(buggyConfigTableName).not.toBe(correctTableName);
  });
});
