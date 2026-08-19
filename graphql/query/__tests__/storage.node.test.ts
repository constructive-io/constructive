import { createHash } from 'crypto';

import type { GraphQLExecutor, StorageMetaResult, StorageTransport } from '../src/storage';
import {
  buildDownloadUrlDocument,
  buildUploadDocument,
  createStorageClient,
  findStorageSurface,
  resolveStorageSurfaces,
  STORAGE_META_QUERY,
} from '../src/storage';

function uploadSurface(typeName: string, requiresOwnerId = false) {
  return {
    mutation: `upload${typeName}`,
    inputType: `Upload${typeName}Input`,
    payloadType: `Upload${typeName}Payload`,
    bulkMutation: `bulkUpload${typeName}s`,
    bulkInputType: `BulkUpload${typeName}sInput`,
    bulkPayloadType: `BulkUpload${typeName}sPayload`,
    bulkFileInputType: `BulkUpload${typeName}Input`,
    bulkFilePayloadType: `BulkUpload${typeName}Payload`,
    requiresOwnerId,
  };
}

function metaResult(): StorageMetaResult {
  return {
    _meta: {
      tables: [
        {
          name: 'User',
          tableName: 'users',
          schemaName: 'app_public',
          query: { one: 'user' },
          storage: null,
        },
        {
          name: 'File',
          tableName: 'files',
          schemaName: 'storage_public',
          query: { one: 'file' },
          storage: {
            isFilesTable: true,
            isBucketsTable: false,
            filesType: 'File',
            bucketsType: 'Bucket',
            downloadUrlField: 'downloadUrl',
            upload: uploadSurface('File'),
          },
        },
        {
          name: 'Bucket',
          tableName: 'buckets',
          schemaName: 'storage_public',
          query: { one: 'bucket' },
          storage: {
            isFilesTable: false,
            isBucketsTable: true,
            filesType: 'File',
            bucketsType: 'Bucket',
            downloadUrlField: null,
            upload: uploadSurface('File'),
          },
        },
        {
          name: 'OrgFile',
          tableName: 'org_files',
          schemaName: 'entity_public',
          query: { one: 'orgFile' },
          storage: {
            isFilesTable: true,
            isBucketsTable: false,
            filesType: 'OrgFile',
            bucketsType: 'OrgBucket',
            downloadUrlField: 'downloadUrl',
            upload: uploadSurface('OrgFile', true),
          },
        },
        {
          name: 'OrgBucket',
          tableName: 'org_buckets',
          schemaName: 'entity_public',
          query: { one: 'orgBucket' },
          storage: {
            isFilesTable: false,
            isBucketsTable: true,
            filesType: 'OrgFile',
            bucketsType: 'OrgBucket',
            downloadUrlField: null,
            upload: uploadSurface('OrgFile', true),
          },
        },
      ],
    },
  };
}

function fakeFile(content = 'hello world', name = 'hello.txt', type = 'text/plain') {
  const bytes = new TextEncoder().encode(content);
  return {
    name,
    size: bytes.byteLength,
    type,
    arrayBuffer: async () => bytes.buffer as ArrayBuffer,
  };
}

interface PutCall {
  url: string;
  contentType: string;
  size: number;
}

function fakeTransport(puts: PutCall[] = []): StorageTransport {
  return {
    hashFile: async (file) =>
      createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'),
    putObject: async (url, body, contentType) => {
      puts.push({ url, contentType, size: body.byteLength });
    },
  };
}

describe('resolveStorageSurfaces()', () => {
  it('pairs files and buckets sides into one surface per plane', () => {
    const surfaces = resolveStorageSurfaces(metaResult());
    expect(surfaces).toHaveLength(2);

    const plane = surfaces.find((s) => s.filesType === 'File')!;
    expect(plane.bucketsType).toBe('Bucket');
    expect(plane.filesTable).toEqual({ name: 'File', tableName: 'files', schemaName: 'storage_public' });
    expect(plane.bucketsTable).toEqual({ name: 'Bucket', tableName: 'buckets', schemaName: 'storage_public' });
    expect(plane.filesNodeField).toBe('file');
    expect(plane.downloadUrlField).toBe('downloadUrl');
    expect(plane.upload.mutation).toBe('uploadFile');
    expect(plane.upload.requiresOwnerId).toBe(false);

    const entityPlane = surfaces.find((s) => s.filesType === 'OrgFile')!;
    expect(entityPlane.upload.requiresOwnerId).toBe(true);
  });

  it('throws on a missing _meta payload', () => {
    expect(() => resolveStorageSurfaces({} as StorageMetaResult)).toThrow('STORAGE_META_MALFORMED');
  });

  it('throws when a buckets table reports a plane with no files table', () => {
    const result = metaResult();
    result._meta.tables = result._meta.tables.filter((t) => t.tableName !== 'files');
    expect(() => resolveStorageSurfaces(result)).toThrow('STORAGE_META_MALFORMED');
  });

  it('throws when two files tables report the same plane', () => {
    const result = metaResult();
    const dupe = JSON.parse(JSON.stringify(result._meta.tables[1]));
    dupe.tableName = 'files_two';
    result._meta.tables.push(dupe);
    expect(() => resolveStorageSurfaces(result)).toThrow('STORAGE_META_MALFORMED');
  });

  it('throws when storage metadata is neither files nor buckets side', () => {
    const result = metaResult();
    result._meta.tables[1].storage!.isFilesTable = false;
    expect(() => resolveStorageSurfaces(result)).toThrow('STORAGE_META_MALFORMED');
  });
});

describe('findStorageSurface()', () => {
  const surfaces = resolveStorageSurfaces(metaResult());

  it('finds a plane by files table name', () => {
    expect(findStorageSurface(surfaces, { filesTable: 'files' }).filesType).toBe('File');
    expect(findStorageSurface(surfaces, { filesTable: 'org_files' }).filesType).toBe('OrgFile');
  });

  it('finds a plane by schema + table', () => {
    const surface = findStorageSurface(surfaces, { schemaName: 'entity_public', filesTable: 'org_files' });
    expect(surface.filesType).toBe('OrgFile');
  });

  it('throws on an empty selector', () => {
    expect(() => findStorageSurface(surfaces, {})).toThrow('STORAGE_SURFACE_SELECTOR_EMPTY');
  });

  it('throws when nothing matches', () => {
    expect(() => findStorageSurface(surfaces, { filesTable: 'nope' })).toThrow('STORAGE_SURFACE_NOT_FOUND');
  });

  it('throws when the selector is ambiguous', () => {
    const twoPlanes = resolveStorageSurfaces(metaResult());
    expect(() =>
      findStorageSurface(twoPlanes, { schemaName: 'storage_public' }),
    ).not.toThrow();
    const clash = twoPlanes.map((s) => ({
      ...s,
      filesTable: { ...s.filesTable, schemaName: 'same' },
    }));
    expect(() => findStorageSurface(clash, { schemaName: 'same' })).toThrow('STORAGE_SURFACE_AMBIGUOUS');
  });
});

describe('buildUploadDocument()', () => {
  it('builds the mutation entirely from the surface', () => {
    const surface = findStorageSurface(resolveStorageSurfaces(metaResult()), { filesTable: 'files' });
    const document = buildUploadDocument(surface);
    expect(document).toMatchSnapshot();
    expect(document).toContain('mutation UploadFileMutation($input: UploadFileInput!)');
    expect(document).toContain('uploadFile(input: $input)');
    expect(document).toContain('uploadUrl');
    expect(document).toContain('previousVersionId');
  });
});

describe('buildDownloadUrlDocument()', () => {
  const surfaces = resolveStorageSurfaces(metaResult());

  it('builds the query from the surface node field and download field', () => {
    const document = buildDownloadUrlDocument(surfaces.find((s) => s.filesType === 'File')!);
    expect(document).toMatchSnapshot();
    expect(document).toContain('file(id: $id)');
    expect(document).toContain('downloadUrl');
  });

  it('throws when the plane has no download field', () => {
    const surface = { ...surfaces[0], downloadUrlField: null as string | null };
    expect(() => buildDownloadUrlDocument(surface)).toThrow('STORAGE_SURFACE_NO_DOWNLOAD_FIELD');
  });

  it('throws when the plane has no single-row query field', () => {
    const surface = { ...surfaces[0], filesNodeField: null as string | null };
    expect(() => buildDownloadUrlDocument(surface)).toThrow('STORAGE_SURFACE_NO_NODE_FIELD');
  });
});

describe('createStorageClient()', () => {
  function clientWith(
    uploadResponse: Record<string, unknown>,
    calls: Array<{ query: string; variables: Record<string, unknown> }> = [],
    puts: PutCall[] = [],
  ) {
    const execute: GraphQLExecutor = async (query, variables) => {
      calls.push({ query, variables });
      if (query.includes('_meta')) return metaResult() as unknown as Record<string, unknown>;
      return uploadResponse;
    };
    return {
      client: createStorageClient({ execute, transport: fakeTransport(puts) }),
      calls,
      puts,
    };
  }

  it('discovers surfaces through the storage meta query and caches them', async () => {
    const calls: Array<{ query: string; variables: Record<string, unknown> }> = [];
    const { client } = clientWith({}, calls);
    const first = await client.discover();
    const second = await client.discover();
    expect(first).toHaveLength(2);
    expect(second).toBe(first);
    expect(calls.filter((c) => c.query === STORAGE_META_QUERY)).toHaveLength(1);
  });

  it('requires ownerId for entity-keyed planes', async () => {
    const { client } = clientWith({});
    await expect(
      client.upload({ filesTable: 'org_files' }, { file: fakeFile() }),
    ).rejects.toThrow(/requires ownerId/);
  });

  it('uploads through the dynamic mutation and skips PUT when deduplicated', async () => {
    const calls: Array<{ query: string; variables: Record<string, unknown> }> = [];
    const { client } = clientWith(
      {
        uploadFile: {
          uploadUrl: null,
          fileId: 'file-1',
          key: 'abc123',
          deduplicated: true,
          expiresAt: null,
          previousVersionId: null,
        },
      },
      calls,
    );

    const result = await client.upload({ filesTable: 'files' }, { file: fakeFile(), bucketKey: 'public' });

    expect(result).toEqual({
      fileId: 'file-1',
      key: 'abc123',
      deduplicated: true,
      expiresAt: null,
      previousVersionId: null,
    });

    const mutationCall = calls.find((c) => c.query.includes('uploadFile(input: $input)'))!;
    expect(mutationCall).toBeDefined();
    const input = mutationCall.variables.input as Record<string, unknown>;
    expect(input.bucketKey).toBe('public');
    expect(input.contentType).toBe('text/plain');
    expect(typeof input.contentHash).toBe('string');
    expect((input.contentHash as string)).toHaveLength(64);
    expect(input.size).toBe(11);
    expect(input.filename).toBe('hello.txt');
  });

  it('throws when the server returns no upload URL for a non-deduplicated upload', async () => {
    const { client } = clientWith({
      uploadFile: {
        uploadUrl: null,
        fileId: 'file-1',
        key: 'abc123',
        deduplicated: false,
        expiresAt: null,
        previousVersionId: null,
      },
    });

    await expect(
      client.upload({ filesTable: 'files' }, { file: fakeFile() }),
    ).rejects.toThrow(/no uploadUrl/);
  });

  it('throws when the mutation returns no payload', async () => {
    const { client } = clientWith({});
    await expect(
      client.upload({ filesTable: 'files' }, { file: fakeFile() }),
    ).rejects.toThrow(/No data returned from uploadFile/);
  });

  it('rejects empty files', async () => {
    const { client } = clientWith({});
    await expect(
      client.upload({ filesTable: 'files' }, { file: fakeFile('') }),
    ).rejects.toThrow(/File is empty/);
  });

  it('PUTs the bytes through the injected transport when not deduplicated', async () => {
    const { client, puts } = clientWith({
      uploadFile: {
        uploadUrl: 'https://s3.example/presigned',
        fileId: 'file-2',
        key: 'def456',
        deduplicated: false,
        expiresAt: '2030-01-01T00:00:00Z',
        previousVersionId: null,
      },
    });

    const result = await client.upload({ filesTable: 'files' }, { file: fakeFile() });

    expect(result.fileId).toBe('file-2');
    expect(puts).toEqual([
      { url: 'https://s3.example/presigned', contentType: 'text/plain', size: 11 },
    ]);
  });

  it('refuses to upload without a transport adapter', async () => {
    const execute: GraphQLExecutor = async () =>
      metaResult() as unknown as Record<string, unknown>;
    const client = createStorageClient({ execute });
    await expect(
      client.upload({ filesTable: 'files' }, { file: fakeFile() }),
    ).rejects.toThrow(/STORAGE_TRANSPORT_MISSING/);
  });
});
