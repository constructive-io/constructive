# Export Meta Fix Plan

## Problem Statement

The `pgpm export` command's `meta_public` schema export is broken. The export functionality in `pgpm/core/src/export/export-meta.ts` has several issues that cause the generated SQL to fail when replayed.

## Issues Identified

### Critical Issues

1. **Table name mismatch (`database_extension`)**
   - Location: `pgpm/core/src/export/export-meta.ts` line 26-27
   - Config defines: `table: 'database_extensions'` (plural)
   - Actual table: `collections_public.database_extension` (singular)
   - Impact: Generated INSERT statements target non-existent table

2. **Missing columns in `user_auth_module` config**
   - Actual table has columns not in export config:
     - `audits_table_id`
     - `audits_table_name`
     - `verify_password_function`
     - `check_password_function`
   - Impact: Exported data is incomplete

3. **Missing `field` query**
   - The `field` table is defined in config (lines 54-65) but never queried
   - No `queryAndParse('field', ...)` call exists
   - Impact: Field data is never exported

4. **Missing `site_metadata` table**
   - Table exists in `meta_public` schema but not in export config
   - Impact: Site metadata is never exported

### Secondary Issues

5. **Insert order vs FK constraints**
   - Export queries `domains` before `apis`/`sites`
   - `domains` has FK references to both `apis` and `sites`
   - Code relies on `SET session_replication_role TO replica;` (requires superuser)
   - Impact: May fail in non-superuser environments

6. **Type mismatches** (may or may not cause issues depending on csv-to-pg handling)
   - `meta_public.sites.favicon`: actual `attachment`, config says `upload`
   - `meta_public.domains.subdomain/domain`: actual `hostname`, config says `text`
   - `meta_public.api_modules.data`: actual `pg_catalog.json`, config says `jsonb`
   - `meta_public.site_modules.data`: actual `pg_catalog.json`, config says `jsonb`

## Proposed Solution

### Phase 1: Create Test Infrastructure

1. **Create a new test module** in `extensions/` directory
   - Name: `@pgpm/export-meta-test` or similar
   - Purpose: Test the export functionality with seed data

2. **Use `pgsql-test` for database testing**
   - Leverage existing test infrastructure
   - Transaction-isolated tests with automatic rollback

3. **Test approach**:
   - Install `@pgpm/metaschema-schema` and `@pgpm/metaschema-modules`
   - Seed representative data into all relevant tables
   - Call `exportMeta()` to generate SQL
   - Execute generated SQL in a fresh transaction
   - Verify data integrity

### Phase 2: Fix Export Issues

1. Fix `database_extensions` -> `database_extension` table name
2. Add missing columns to `user_auth_module` config
3. Add `queryAndParse('field', ...)` call
4. Add `site_metadata` table to config and query
5. Fix insert order to respect FK dependencies
6. Update type mappings if needed

### Phase 3: Add Schema Drift Detection

1. Create a test that compares `information_schema.columns` against the config
2. Fail if config doesn't cover all required columns
3. Prevent future regressions when schema changes

## Test Module Structure

```
extensions/@pgpm/export-meta-test/
├── package.json
├── jest.config.js
├── __tests__/
│   ├── export-meta.test.ts      # Main export tests
│   └── schema-drift.test.ts     # Schema drift detection
└── seed/
    └── seed-data.ts             # Seed data helpers
```

## Dependencies

- `@pgpm/metaschema-schema` - Core schema definitions
- `@pgpm/metaschema-modules` - Module table definitions
- `pgsql-test` - Test infrastructure
- `@pgpmjs/core` - Export functionality to test

## Success Criteria

1. Export generates valid SQL that can be replayed
2. All tables in `meta_public` and `collections_public` are properly exported
3. FK constraints are respected (either via proper ordering or explicit handling)
4. Tests catch schema drift automatically
5. CI passes with new tests

## Questions to Resolve

1. Should this be a separate module or part of existing `db-meta-schema` tests?
2. Do we need to support non-superuser deployments (affects `session_replication_role` approach)?
3. Should we add the tests to `launchql-extensions` repo as well for parity?
