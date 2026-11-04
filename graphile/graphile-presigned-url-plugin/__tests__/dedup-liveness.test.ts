/**
 * A dedup hit must name bytes that exist.
 *
 * The files row is written before the presigned PUT, so a `requested` row may
 * have no object behind it. Reporting such a row as `deduplicated: true` hands
 * the caller a reference to an object that is not in S3, and leaves no way to
 * ever upload it. The confirm-upload job settles `status` once it has inspected
 * the object, so the row's status — never an S3 HEAD — decides whether it is live.
 *
 * The database is faked at the query boundary and S3 at the client's `send`.
 */

const mockS3Send = jest.fn();
jest.mock('@constructive-io/s3-utils', () => ({
  createS3Client: jest.fn(() => ({ send: mockS3Send })),
}));

jest.mock('../src/s3-signer', () => ({
  ...jest.requireActual('../src/s3-signer'),
  generatePresignedPutUrl: jest.fn().mockResolvedValue('https://s3.example.com/put'),
}));

import { HeadObjectCommand } from '@aws-sdk/client-s3';

import { finalizeStagedUpload } from '../src/managed-upload';
import { processSingleFile } from '../src/plugin';
import type { BucketConfig, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from '../src/types';

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const OLD_FILE_ID = '44444444-4444-4444-4444-444444444444';
const NEW_FILE_ID = '55555555-5555-5555-5555-555555555555';
const HASH = 'b'.repeat(64);
const SITE_KEY = 'index.html';

function storageConfig(overrides: Partial<StorageModuleConfig> = {}): StorageModuleConfig {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    scope: 'database',
    bucketsQualifiedName: 'storage_public.app_buckets',
    filesQualifiedName: 'storage_public.app_files',
    filesTableName: 'app_files',
    recorderQualifiedName: 'storage_private.app_files_record_file',
    bucketPhysicalNameQualifiedName: 'storage_private.app_buckets_physical_name',
    defaultMaxFileSize: 1000,
    maxFilenameLength: 1024,
    uploadUrlExpirySeconds: 900,
    hasPathShares: false,
    hasVersioning: false,
    hasContentHash: false,
    ...overrides,
  } as unknown as StorageModuleConfig;
}

const bucket = {
  id: BUCKET_ID,
  key: 'site',
  type: 'public',
  is_public: true,
  owner_id: null,
  allowed_mime_types: null,
  max_file_size: null,
  allow_custom_keys: true,
} as unknown as BucketConfig;

function fakeS3(): S3Config {
  return {
    client: { send: jest.fn(async () => ({})) },
    bucket: 'site-bucket',
    region: 'us-east-1',
  } as unknown as S3Config;
}

const heads = (s3: S3Config) =>
  (s3.client.send as jest.Mock).mock.calls
    .map(([command]) => command)
    .filter((command) => command instanceof HeadObjectCommand);

const options: PresignedUrlPluginOptions = { credentials: { accessKeyId: 'test', secretAccessKey: 'test' } };

/** A tx whose one existing row sits at `rowKey` carrying HASH in `status`. */
function fakeTx(rowKey: string, status: string) {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const txClient = {
    async query(opts: { text: string; values: unknown[] }) {
      queries.push(opts);
      if (/record_file\(/.test(opts.text)) return { rows: [{ id: NEW_FILE_ID }] };
      if (/^SELECT id/.test(opts.text)) {
        return { rows: [{ id: OLD_FILE_ID, key: rowKey, content_hash: HASH, status }] };
      }
      if (/^DELETE FROM storage_public\.app_files/.test(opts.text)) return { rows: [{ id: OLD_FILE_ID }] };
      throw new Error(`unexpected query: ${opts.text}`);
    },
  };
  return { txClient, queries };
}

const upload = (txClient: unknown, s3: S3Config, key?: string) =>
  processSingleFile(options, txClient, storageConfig(), 'db', bucket, s3, {
    contentHash: HASH,
    contentType: 'text/html',
    size: 16,
    filename: SITE_KEY,
    key,
  });

describe.each([
  ['content-addressed key', undefined, HASH],
  ['custom key', SITE_KEY, SITE_KEY],
])('presigned retry of a never-completed upload (%s)', (_label, customKey, rowKey) => {
  it.each(['requested', 'rejected', 'expired'])(
    'issues a fresh upload URL when the row is %s, without probing S3',
    async (status) => {
      const s3 = fakeS3();
      const { txClient, queries } = fakeTx(rowKey, status);

      const result = await upload(txClient, s3, customKey);

      expect(result).toMatchObject({
        fileId: NEW_FILE_ID,
        deduplicated: false,
        uploadUrl: 'https://s3.example.com/put',
      });
      expect(heads(s3)).toEqual([]);
      const del = queries.find((q) => /^DELETE/.test(q.text));
      expect(del?.values).toEqual([OLD_FILE_ID]);
    },
  );

  it.each(['uploaded', 'processed'])('deduplicates when the row is %s', async (status) => {
    const s3 = fakeS3();
    const { txClient, queries } = fakeTx(rowKey, status);

    const result = await upload(txClient, s3, customKey);

    expect(result).toMatchObject({ fileId: OLD_FILE_ID, deduplicated: true, uploadUrl: null });
    expect(heads(s3)).toEqual([]);
    expect(queries).toHaveLength(1);
    expect(queries[0].text).toContain('status');
  });
});

describe('content-addressed upload whose hash matches a custom-key row', () => {
  // Custom-key rows carry content_hash too, so the hash probe can match a row
  // whose bytes live at its own key, not at the hash.
  it('deduplicates against a live row and leaves it in place', async () => {
    const s3 = fakeS3();
    const { txClient, queries } = fakeTx(SITE_KEY, 'uploaded');

    const result = await upload(txClient, s3);

    expect(result).toMatchObject({ fileId: OLD_FILE_ID, deduplicated: true, uploadUrl: null, key: SITE_KEY });
    expect(queries.some((q) => /^DELETE/.test(q.text))).toBe(false);
  });

  it('restarts the upload when that row is still requested', async () => {
    const s3 = fakeS3();
    const { txClient, queries } = fakeTx(SITE_KEY, 'requested');

    const result = await upload(txClient, s3);

    expect(result).toMatchObject({ fileId: NEW_FILE_ID, deduplicated: false, key: HASH });
    expect(queries.find((q) => /^DELETE/.test(q.text))?.values).toEqual([OLD_FILE_ID]);
  });
});

describe('streamed upload landing on a never-completed row', () => {
  const staged = {
    stagingKey: '.staging/tmp-1',
    contentHash: HASH,
    contentType: 'text/html',
    size: 16,
    filename: SITE_KEY,
  };

  function db({ status = 'requested', deleteAffects = true } = {}) {
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const client = {
      async query(opts: { text: string; values?: unknown[] }) {
        queries.push(opts);
        if (/set_config/.test(opts.text)) return { rows: [] };
        if (/SELECT id, key, mime_type/.test(opts.text)) {
          return { rows: [{ id: OLD_FILE_ID, key: HASH, mime_type: 'text/html', size: 16, filename: null as string | null, status }] };
        }
        if (/^DELETE FROM storage_public\.app_files/.test(opts.text)) {
          return { rows: deleteAffects ? [{ id: OLD_FILE_ID }] : [] };
        }
        if (/record_file/.test(opts.text)) return { rows: [{ id: NEW_FILE_ID }] };
        throw new Error(`unexpected query: ${opts.text}`);
      },
      withTransaction: (cb: any) => cb(client),
    };
    return { withPgClient: (_settings: any, cb: any) => cb(client), queries };
  }

  const target = (s3: S3Config): any => ({
    databaseId: 'db',
    storageConfig: storageConfig(),
    bucket,
    physicalName: 'site-bucket',
    s3,
    binding: null,
  });

  it('promotes the staged bytes as a fresh file instead of absorbing them into the requested row', async () => {
    const s3 = fakeS3();
    const fake = db();

    const { projection, deduplicated } = await finalizeStagedUpload({
      target: target(s3), withPgClient: fake.withPgClient, pgSettings: null, staged,
    });

    expect(deduplicated).toBe(false);
    expect(projection.id).toBe(NEW_FILE_ID);
    expect(heads(s3)).toEqual([]);
    expect(fake.queries.find((q) => /^DELETE/.test(q.text))?.values).toEqual([OLD_FILE_ID]);
  });

  it('fails instead of promoting when the caller cannot delete the requested row', async () => {
    const s3 = fakeS3();
    const fake = db({ deleteAffects: false });

    await expect(
      finalizeStagedUpload({ target: target(s3), withPgClient: fake.withPgClient, pgSettings: null, staged }),
    ).rejects.toThrow(/FILE_NOT_REPLACEABLE/);

    expect(fake.queries.some((q) => /record_file/.test(q.text))).toBe(false);
    const sent = (s3.client.send as jest.Mock).mock.calls.map(([command]) => command);
    expect(sent.map((command) => command.constructor.name)).toEqual(['DeleteObjectCommand']);
    expect(sent[0].input.Key).toBe(staged.stagingKey);
  });

  it('deduplicates against an uploaded row', async () => {
    const s3 = fakeS3();
    const fake = db({ status: 'uploaded' });

    const { projection, deduplicated } = await finalizeStagedUpload({
      target: target(s3), withPgClient: fake.withPgClient, pgSettings: null, staged,
    });

    expect(deduplicated).toBe(true);
    expect(projection.id).toBe(OLD_FILE_ID);
    expect(fake.queries.some((q) => /DELETE|record_file/.test(q.text))).toBe(false);
  });
});
