/**
 * Unit tests for resolveStorageConfigFromCodec.
 *
 * These are pure (no DB) tests covering both the single-tenant path (exact
 * physical schema match) and the blueprint-pooling path, where the codec's
 * build-time schema belongs to the REPRESENTATIVE tenant but the request's
 * configs carry a DIFFERENT tenant's actual (differently-hashed) schema. In
 * that case the resolver must fall back to matching on the LOGICAL schema
 * name (the tenant hash prefix stripped from both sides).
 */

import { resolveStorageConfigFromCodec } from '../src/storage-module-cache';
import type { StorageModuleConfig } from '../src/types';

// --- Fixtures -------------------------------------------------------------

// Two real-shaped hashed tenant schemas that share the SAME logical suffix
// (`storage-public`). Under pooling, the shared instance is built against the
// representative tenant's schema, while requests route to other tenants.
const REPRESENTATIVE_SCHEMA = 'marketplace-db-tenant1-5e6b13b2-storage-public';
const TENANT_SCHEMA = 'marketplace-db-tenant2-35a03232-storage-public';

function makeConfig(
  overrides: Partial<StorageModuleConfig> &
    Pick<StorageModuleConfig, 'id' | 'schemaName' | 'bucketsTableName' | 'filesTableName'>,
): StorageModuleConfig {
  return {
    bucketsQualifiedName: `"${overrides.schemaName}"."${overrides.bucketsTableName}"`,
    filesQualifiedName: `"${overrides.schemaName}"."${overrides.filesTableName}"`,
    scope: 'app',
    entityTableId: null,
    entityQualifiedName: null,
    endpoint: null,
    publicUrlPrefix: null,
    provider: null,
    allowedOrigins: null,
    uploadUrlExpirySeconds: 900,
    downloadUrlExpirySeconds: 3600,
    defaultMaxFileSize: 200 * 1024 * 1024,
    maxFilenameLength: 1024,
    cacheTtlSeconds: 3600,
    hasPathShares: false,
    maxBulkFiles: 100,
    maxBulkTotalSize: 1073741824,
    ...overrides,
  };
}

function makeCodec(schemaName: string | undefined, name: string | undefined) {
  return { name: name as string, extensions: { pg: { schemaName, name } } };
}

// --- Tests ----------------------------------------------------------------

describe('resolveStorageConfigFromCodec', () => {
  describe('single-tenant (exact physical schema match)', () => {
    it('matches a files codec by exact schema + files table name', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(TENANT_SCHEMA, 'app_files');

      expect(resolveStorageConfigFromCodec(codec, [config])).toBe(config);
    });

    it('matches a buckets codec by exact schema + buckets table name', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(TENANT_SCHEMA, 'app_buckets');

      expect(resolveStorageConfigFromCodec(codec, [config])).toBe(config);
    });

    it('matches plain (non-hashed) schemas exactly, unaffected by hash stripping', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: 'app_public',
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec('app_public', 'app_files');

      expect(resolveStorageConfigFromCodec(codec, [config])).toBe(config);
    });
  });

  describe('blueprint pooling (logical schema match across tenants)', () => {
    it('matches a files codec built for the representative tenant against another tenant config', () => {
      // Build-time codec: representative tenant. Request config: a DIFFERENT tenant.
      const tenantConfig = makeConfig({
        id: 'sm-tenant2',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(REPRESENTATIVE_SCHEMA, 'app_files');

      // Physical schemas differ; logical suffix (`storage-public`) is shared.
      expect(REPRESENTATIVE_SCHEMA).not.toEqual(TENANT_SCHEMA);
      expect(resolveStorageConfigFromCodec(codec, [tenantConfig])).toBe(tenantConfig);
    });

    it('matches a buckets codec built for the representative tenant against another tenant config', () => {
      const tenantConfig = makeConfig({
        id: 'sm-tenant2',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(REPRESENTATIVE_SCHEMA, 'app_buckets');

      expect(resolveStorageConfigFromCodec(codec, [tenantConfig])).toBe(tenantConfig);
    });

    it('does NOT match when the logical schema suffix differs', () => {
      // A codec whose logical schema is `analytics-public` must not resolve to a
      // `storage-public` config even though both are hashed tenant schemas.
      const tenantConfig = makeConfig({
        id: 'sm-tenant2',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec('marketplace-db-tenant1-5e6b13b2-analytics-public', 'app_files');

      expect(resolveStorageConfigFromCodec(codec, [tenantConfig])).toBeNull();
    });
  });

  describe('exact-physical priority', () => {
    it('prefers an exact physical match over a logical-only match', () => {
      const exactConfig = makeConfig({
        id: 'sm-exact',
        schemaName: REPRESENTATIVE_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const logicalOnlyConfig = makeConfig({
        id: 'sm-logical',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(REPRESENTATIVE_SCHEMA, 'app_files');

      // exactConfig listed AFTER the logical-only one to prove priority is by
      // match quality, not array order.
      const result = resolveStorageConfigFromCodec(codec, [logicalOnlyConfig, exactConfig]);
      expect(result).toBe(exactConfig);
    });
  });

  describe('non-matches and guards', () => {
    it('returns null when the table name matches nothing', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(REPRESENTATIVE_SCHEMA, 'some_unrelated_table');

      expect(resolveStorageConfigFromCodec(codec, [config])).toBeNull();
    });

    it('returns null when the codec has no schemaName', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = makeCodec(undefined, 'app_files');

      expect(resolveStorageConfigFromCodec(codec, [config])).toBeNull();
    });

    it('returns null when the codec has no resolvable table name', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = { name: undefined as unknown as string, extensions: { pg: { schemaName: REPRESENTATIVE_SCHEMA } } };

      expect(resolveStorageConfigFromCodec(codec, [config])).toBeNull();
    });

    it('falls back to codec.name for the table name when extensions.pg.name is absent', () => {
      const config = makeConfig({
        id: 'sm-1',
        schemaName: TENANT_SCHEMA,
        bucketsTableName: 'app_buckets',
        filesTableName: 'app_files',
      });
      const codec = { name: 'app_files', extensions: { pg: { schemaName: REPRESENTATIVE_SCHEMA } } };

      expect(resolveStorageConfigFromCodec(codec, [config])).toBe(config);
    });
  });
});
