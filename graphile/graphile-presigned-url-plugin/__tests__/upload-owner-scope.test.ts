import { resolveUploadOwnerScope } from '../src/plugin';
import type { StorageModuleConfig } from '../src/types';

const moduleConfig = (scope: string): StorageModuleConfig => ({
  id: '00000000-0000-4000-8000-000000000001',
  bucketsQualifiedName: 'storage_public.app_buckets',
  filesQualifiedName: 'storage_public.app_files',
  schemaName: 'storage_public',
  bucketsTableName: 'app_buckets',
  filesTableName: 'app_files',
  scope,
  entityTableId: scope === 'app' ? null : '00000000-0000-4000-8000-000000000002',
  entityQualifiedName: scope === 'app' ? null : 'app_public.organizations',
  endpoint: null,
  publicUrlPrefix: null,
  provider: 's3',
  allowedOrigins: null,
  uploadUrlExpirySeconds: 900,
  downloadUrlExpirySeconds: 3600,
  defaultMaxFileSize: 1024,
  maxFilenameLength: 1024,
  cacheTtlSeconds: 300,
  hasPathShares: false,
  maxBulkFiles: 100,
  maxBulkTotalSize: 1024,
});

const filesCodec = {
  name: 'app_files',
  extensions: {
    pg: { schemaName: 'storage_public', name: 'app_files' },
  },
};

const bucketCodec = (withOwnerColumn = true) => ({
  name: 'app_buckets',
  attributes: withOwnerColumn ? { owner_id: { codec: 'uuid-codec' } } : {},
  extensions: {
    pg: { schemaName: 'storage_public', name: 'app_buckets' },
  },
});

describe('upload owner scope', () => {
  it('keeps ownerId optional for an authoritative app-scoped module', () => {
    expect(resolveUploadOwnerScope(
      filesCodec,
      bucketCodec(),
      [moduleConfig('app')],
    )).toEqual({ hasOwnerId: false, ownerIdCodec: 'uuid-codec' });
  });

  it('requires ownerId for an authoritative entity-scoped module', () => {
    expect(resolveUploadOwnerScope(
      filesCodec,
      bucketCodec(),
      [moduleConfig('organization')],
    )).toEqual({ hasOwnerId: true, ownerIdCodec: 'uuid-codec' });
  });

  it('fails closed when entity scope has no owner_id column', () => {
    expect(() => resolveUploadOwnerScope(
      filesCodec,
      bucketCodec(false),
      [moduleConfig('organization')],
    )).toThrow('STORAGE_OWNER_COLUMN_REQUIRED:storage_public.app_buckets');
  });

  it('omits upload fields when an authoritative snapshot has no matching module', () => {
    expect(resolveUploadOwnerScope(filesCodec, bucketCodec(), [])).toBeNull();
  });

  it('retains column inference only for generic consumers without a snapshot', () => {
    expect(resolveUploadOwnerScope(filesCodec, bucketCodec(), undefined)).toEqual({
      hasOwnerId: true,
      ownerIdCodec: 'uuid-codec',
    });
    expect(resolveUploadOwnerScope(filesCodec, bucketCodec(false), undefined)).toEqual({
      hasOwnerId: false,
      ownerIdCodec: null,
    });
  });
});
