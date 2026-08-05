import type { Pool } from 'pg';

import { storageLoader, STORAGE_MODULE_SQL } from '../loaders/storage';

describe('storage control-plane loader', () => {
  afterEach(() => storageLoader.invalidate());

  it('normalizes immutable module metadata and caches it by database contract', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{
        id: 'storage-a',
        scope: 'app',
        entity_table_id: null,
        buckets_schema: 'tenant-a',
        buckets_table: 'buckets"table',
        files_schema: 'tenant-a',
        files_table: 'files',
        endpoint: null,
        public_url_prefix: null,
        provider: null,
        allowed_origins: null,
        upload_url_expiry_seconds: null,
        download_url_expiry_seconds: null,
        default_max_file_size: null,
        max_filename_length: null,
        cache_ttl_seconds: null,
        max_bulk_files: null,
        max_bulk_total_size: '1073741824',
        has_path_shares: null,
        entity_schema: null,
        entity_table: null
      }]
    });
    const ctx = {
      routingPool: {} as Pool,
      tenantPool: { query } as unknown as Pool,
      databaseId: 'database-storage-loader-test',
      dbname: 'tenant_db'
    };

    const first = await storageLoader.resolve(ctx);
    const cached = await storageLoader.resolve(ctx);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(STORAGE_MODULE_SQL, [ctx.databaseId]);
    expect(cached).toBe(first);
    expect(first?.modules[0]).toMatchObject({
      bucketsQualifiedName: '"tenant-a"."buckets""table"',
      filesQualifiedName: '"tenant-a"."files"',
      uploadUrlExpirySeconds: 900,
      maxBulkTotalSize: 1073741824,
      hasPathShares: false
    });
  });
});
