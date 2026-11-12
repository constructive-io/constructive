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

/**
 * A tx whose one existing row sits at `rowKey` carrying HASH in `status`. The
 * resolver probes by key (the custom key, or the hash's own key), so the row is
 * found only when the probed key is its own.
 */
function fakeTx(rowKey: string, status: string) {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const txClient = {
    async query(opts: { text: string; values: unknown[] }) {
      queries.push(opts);
      if (/record_file\(/.test(opts.text)) return { rows: [{ id: NEW_FILE_ID }] };
      if (/^SELECT id/.test(opts.text)) {
        return { rows: opts.values[0] === rowKey ? [{ id: OLD_FILE_ID, status }] : [] };
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

describe('content-addressed upload whose hash a custom-key row carries', () => {
  // A custom-key row carrying the hash holds the bytes at a key whose next
  // upload replaces them, so it is no dedup target: the probe is by the hash's
  // own key, and a fresh upload is recorded there.
  it('does not deduplicate against it', async () => {
    const s3 = fakeS3();
    const { txClient, queries } = fakeTx(SITE_KEY, 'uploaded');

    const result = await upload(txClient, s3);

    expect(result).toMatchObject({ fileId: NEW_FILE_ID, deduplicated: false, key: HASH });
    expect(queries[0].values).toEqual([HASH, BUCKET_ID]);
    expect(queries.some((q) => /^DELETE/.test(q.text))).toBe(false);
  });
});
