import {
  discoverStoragePlanes,
  pairStoragePlane,
  type StorageCodec,
  type StoragePgRegistry,
  uploadSurfaceNames,
} from '../src';

function codec(
  name: string,
  opts: {
    schemaName?: string;
    tableName?: string;
    tags?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
  } = {},
): StorageCodec {
  return {
    name,
    attributes: opts.attributes ?? { id: {} },
    extensions: {
      pg: { schemaName: opts.schemaName ?? 'storage_public', name: opts.tableName ?? name },
      tags: opts.tags ?? {},
    },
  };
}

/**
 * Build a registry the way graphile-build-pg does: a forward relation entry on
 * the FK-holding codec (isReferencee absent/false), and a mirrored backward
 * entry on the referenced codec (isReferencee: true).
 */
function registry(
  codecs: StorageCodec[],
  fks: { from: StorageCodec; to: StorageCodec; relationName: string; attributes?: string[] }[],
): StoragePgRegistry {
  const pgCodecs: Record<string, StorageCodec> = {};
  for (const c of codecs) pgCodecs[c.name] = c;

  const pgRelations: StoragePgRegistry['pgRelations'] = {};
  for (const c of codecs) pgRelations[c.name] = {};

  for (const fk of fks) {
    const attrs = fk.attributes ?? ['bucket_id'];
    pgRelations[fk.from.name][fk.relationName] = {
      localAttributes: attrs,
      remoteAttributes: ['id'],
      remoteResource: { codec: fk.to },
    };
    pgRelations[fk.to.name][`${fk.from.name}ByTheir${attrs.join('And')}`] = {
      isReferencee: true,
      localAttributes: ['id'],
      remoteAttributes: attrs,
      remoteResource: { codec: fk.from },
    };
  }

  return { pgCodecs, pgRelations };
}

describe('pairStoragePlane', () => {
  it('pairs a prefixed files table with its buckets table through the FK', () => {
    const buckets = codec('appBuckets', { tableName: 'app_buckets', tags: { storageBuckets: true } });
    const files = codec('appFiles', { tableName: 'app_files', tags: { storageFiles: true } });
    const reg = registry([buckets, files], [{ from: files, to: buckets, relationName: 'appBucketsByMyBucketId' }]);

    const pair = pairStoragePlane(files, reg);
    expect(pair.bucketsCodec).toBe(buckets);
    expect(pair.relationName).toBe('appBucketsByMyBucketId');
    expect(pair.fkAttributes).toEqual(['bucket_id']);
    expect(pair.hasOwnerId).toBe(false);
  });

  it('pairs an unprefixed (database-scope) files table — naming carries no meaning', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const reg = registry([buckets, files], [{ from: files, to: buckets, relationName: 'bucketsByMyBucketId' }]);

    const pair = pairStoragePlane(files, reg);
    expect(pair.bucketsCodec).toBe(buckets);
  });

  it('detects an entity-keyed plane from the buckets table owner_id attribute', () => {
    const buckets = codec('dataRoomBuckets', {
      tableName: 'data_room_buckets',
      tags: { storageBuckets: true },
      attributes: { id: {}, owner_id: {} },
    });
    const files = codec('dataRoomFiles', { tableName: 'data_room_files', tags: { storageFiles: true } });
    const reg = registry([buckets, files], [{ from: files, to: buckets, relationName: 'dataRoomBucketsByMyBucketId' }]);

    expect(pairStoragePlane(files, reg).hasOwnerId).toBe(true);
  });

  it('ignores backward (referencee) relations and FKs to untagged tables', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const shares = codec('shares');
    const reg = registry(
      [buckets, files, shares],
      [
        { from: files, to: buckets, relationName: 'bucketsByMyBucketId' },
        { from: shares, to: files, relationName: 'filesByMyFileId', attributes: ['file_id'] },
        { from: files, to: shares, relationName: 'sharesByMyShareId', attributes: ['share_id'] },
      ],
    );

    const pair = pairStoragePlane(files, reg);
    expect(pair.bucketsCodec).toBe(buckets);
    expect(pair.fkAttributes).toEqual(['bucket_id']);
  });

  it('throws STORAGE_PLANE_UNPAIRED when the files table has no FK to a buckets table', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const reg = registry([buckets, files], []);

    expect(() => pairStoragePlane(files, reg)).toThrow(/STORAGE_PLANE_UNPAIRED/);
    expect(() => pairStoragePlane(files, reg)).toThrow(/storage_public\.files/);
  });

  it('throws STORAGE_PLANE_AMBIGUOUS when the files table references two buckets tables', () => {
    const bucketsA = codec('buckets', { tags: { storageBuckets: true } });
    const bucketsB = codec('otherBuckets', { tableName: 'other_buckets', tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const reg = registry(
      [bucketsA, bucketsB, files],
      [
        { from: files, to: bucketsA, relationName: 'bucketsByMyBucketId' },
        { from: files, to: bucketsB, relationName: 'otherBucketsByMyOtherBucketId', attributes: ['other_bucket_id'] },
      ],
    );

    expect(() => pairStoragePlane(files, reg)).toThrow(/STORAGE_PLANE_AMBIGUOUS/);
  });
});

describe('discoverStoragePlanes', () => {
  it('discovers every plane, including multiple planes in one schema', () => {
    const appBuckets = codec('appBuckets', { tableName: 'app_buckets', tags: { storageBuckets: true } });
    const appFiles = codec('appFiles', { tableName: 'app_files', tags: { storageFiles: true } });
    const dbBuckets = codec('buckets', { tags: { storageBuckets: true } });
    const dbFiles = codec('files', { tags: { storageFiles: true } });
    const reg = registry(
      [appBuckets, appFiles, dbBuckets, dbFiles],
      [
        { from: appFiles, to: appBuckets, relationName: 'appBucketsByMyBucketId' },
        { from: dbFiles, to: dbBuckets, relationName: 'bucketsByMyBucketId' },
      ],
    );

    const pairs = discoverStoragePlanes(reg);
    expect(pairs).toHaveLength(2);
    expect(pairs.map((p) => [p.filesCodec.name, p.bucketsCodec.name])).toEqual([
      ['appFiles', 'appBuckets'],
      ['files', 'buckets'],
    ]);
  });

  it('returns [] for a registry with no tagged storage tables', () => {
    const plain = codec('users');
    expect(discoverStoragePlanes(registry([plain], []))).toEqual([]);
  });

  it('throws when a tagged buckets table is referenced by no files table', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    expect(() => discoverStoragePlanes(registry([buckets], []))).toThrow(/STORAGE_PLANE_UNPAIRED/);
  });

  it('throws STORAGE_PLANE_AMBIGUOUS when two files tables reference one buckets table', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const otherFiles = codec('otherFiles', { tableName: 'other_files', tags: { storageFiles: true } });
    const reg = registry(
      [buckets, files, otherFiles],
      [
        { from: files, to: buckets, relationName: 'bucketsByMyBucketId' },
        { from: otherFiles, to: buckets, relationName: 'bucketsByMyOtherBucketId' },
      ],
    );

    expect(() => discoverStoragePlanes(reg)).toThrow(/STORAGE_PLANE_AMBIGUOUS/);
    expect(() => discoverStoragePlanes(reg)).toThrow(/storage_public\.buckets/);
  });

  it('throws (via pairing) when a tagged files table cannot be paired', () => {
    const buckets = codec('buckets', { tags: { storageBuckets: true } });
    const files = codec('files', { tags: { storageFiles: true } });
    const orphanFiles = codec('orphanFiles', { tableName: 'orphan_files', tags: { storageFiles: true } });
    const reg = registry(
      [buckets, files, orphanFiles],
      [{ from: files, to: buckets, relationName: 'bucketsByMyBucketId' }],
    );

    expect(() => discoverStoragePlanes(reg)).toThrow(/STORAGE_PLANE_UNPAIRED/);
  });
});

describe('uploadSurfaceNames', () => {
  it('derives every upload surface name from the inflected type name', () => {
    const files = codec('appFiles', { tableName: 'app_files', tags: { storageFiles: true } });
    const inflection = { tableType: (c: StorageCodec) => (c.name === 'appFiles' ? 'AppFile' : c.name) };

    expect(uploadSurfaceNames(inflection, files)).toEqual({
      filesTypeName: 'AppFile',
      uploadMutation: 'uploadAppFile',
      uploadInputType: 'UploadAppFileInput',
      uploadPayloadType: 'UploadAppFilePayload',
      bulkUploadMutation: 'uploadAppFiles',
      bulkUploadInputType: 'UploadAppFileBulkInput',
      bulkUploadPayloadType: 'UploadAppFileBulkPayload',
      bulkUploadFileInputType: 'UploadAppFileBulkFileInput',
      bulkUploadFilePayloadType: 'UploadAppFileBulkFilePayload',
    });
  });
});
