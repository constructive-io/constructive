import { recordManagedFile } from '../src/storage-file-recorder';
import type { StorageModuleConfig } from '../src/types';

function storageConfig(
  overrides: Partial<StorageModuleConfig> = {},
): StorageModuleConfig {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    bucketsQualifiedName: 'storage_public.app_buckets',
    filesQualifiedName: 'storage_public.app_files',
    schemaName: 'storage_public',
    bucketsTableName: 'app_buckets',
    filesTableName: 'app_files',
    recorderQualifiedName: 'storage_private.app_files_record_file',
    bucketPhysicalNameQualifiedName: 'storage_private.app_buckets_physical_name',
    scope: 'app',
    entityTableId: null,
    entityQualifiedName: null,
    endpoint: null,
    publicUrlPrefix: null,
    provider: 'minio',
    region: 'us-east-1',
    connectionOverrides: [],
    allowedOrigins: null,
    uploadUrlExpirySeconds: 900,
    downloadUrlExpirySeconds: 3600,
    defaultMaxFileSize: 1000,
    maxFilenameLength: 1024,
    cacheTtlSeconds: 300,
    hasPathShares: false,
    hasVersioning: false,
    hasContentHash: false,
    maxBulkFiles: 100,
    maxBulkTotalSize: 1000,
    ...overrides,
  };
}

function input() {
  return {
    bucketId: '22222222-2222-2222-2222-222222222222',
    key: 'assets/logo.png',
    contentHash: 'a'.repeat(64),
    mimeType: 'image/png',
    size: 16,
    filename: 'logo.png',
  };
}

describe('recordManagedFile', () => {
  it('calls the generated recorder with only base object facts', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ id: '33333333-3333-3333-3333-333333333333' }],
    });

    await expect(recordManagedFile({ query }, storageConfig(), input())).resolves.toBe(
      '33333333-3333-3333-3333-333333333333',
    );

    expect(query).toHaveBeenCalledWith({
      text: expect.stringContaining(
        'SELECT id FROM storage_private.app_files_record_file(bucket_id := $1::uuid, key := $2::text',
      ),
      values: [
        input().bucketId,
        input().key,
        input().contentHash,
        input().mimeType,
        input().size,
        input().filename,
        null,
      ],
    });
    expect(query.mock.calls[0][0].text).not.toContain('owner_id');
    expect(query.mock.calls[0][0].text).not.toContain('is_public');
  });

  it('appends a supported path argument by name and never a version link', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'file-id' }] });

    await recordManagedFile(
      { query },
      storageConfig({ hasVersioning: true, hasPathShares: true }),
      {
        ...input(),
        path: 'assets',
      },
    );

    expect(query.mock.calls[0][0].text).not.toContain('previous_version_id');
    expect(query.mock.calls[0][0]).toEqual({
      text: expect.stringMatching(/upload := \$7::jsonb, path := \$8::text\)/),
      values: [
        input().bucketId,
        input().key,
        input().contentHash,
        input().mimeType,
        input().size,
        input().filename,
        null,
        'assets',
      ],
    });
  });

  it('fails loudly when a path is requested on a module without path shares', async () => {
    const query = jest.fn();

    await expect(
      recordManagedFile({ query }, storageConfig(), { ...input(), path: 'assets' }),
    ).rejects.toThrow(
      'STORAGE_PATH_SHARES_UNSUPPORTED: storage module 11111111-1111-1111-1111-111111111111 (app_files)',
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('fails before writing when no recorder is exposed', async () => {
    const query = jest.fn();

    await expect(
      recordManagedFile({ query }, storageConfig({ recorderQualifiedName: null }), input()),
    ).rejects.toThrow(
      'STORAGE_RECORDER_MISSING: storage module 11111111-1111-1111-1111-111111111111 (app_files)',
    );
    expect(query).not.toHaveBeenCalled();
  });
});
