import { processSingleFile } from '../src/plugin';
import { headObject } from '../src/s3-signer';
import type { BucketConfig, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from '../src/types';

jest.mock('../src/s3-signer', () => ({
  ...jest.requireActual('../src/s3-signer'),
  headObject: jest.fn().mockResolvedValue(null),
  generatePresignedPutUrl: jest.fn().mockResolvedValue('https://s3.example.com/put'),
}));

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const OLD_FILE_ID = '44444444-4444-4444-4444-444444444444';
const NEW_FILE_ID = '55555555-5555-5555-5555-555555555555';
const KEY = 'index.html';

function storageConfig(overrides: Partial<StorageModuleConfig> = {}): StorageModuleConfig {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    scope: 'app',
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

const s3 = { client: { send: jest.fn().mockResolvedValue({}) }, bucket: 'site-bucket', region: 'us-east-1' } as unknown as S3Config;
const options: PresignedUrlPluginOptions = { credentials: { accessKeyId: 'test', secretAccessKey: 'test' } };

function fakeTx(row?: { content_hash: string; status: string }, acquired = true) {
  const query = jest.fn(async (opts: { text: string; values: unknown[] }) => {
    if (opts.text.includes('pg_try_advisory_xact_lock')) return { rows: [{ acquired }] };
    if (opts.text.startsWith('SELECT id, status')) return { rows: row ? [{ id: OLD_FILE_ID, ...row }] : [] };
    if (opts.text.includes('record_file(')) return { rows: [{ id: NEW_FILE_ID }] };
    throw new Error(`unexpected query: ${opts.text}`);
  });
  return { query };
}

const hash = 'b'.repeat(64);
const upload = (txClient: unknown, key = KEY) =>
  processSingleFile(options, txClient, storageConfig(), 'db', bucket, s3, {
    contentHash: hash, contentType: 'text/html', size: 16, filename: KEY, key,
  });

describe('custom upload key reservations', () => {
  it.each([
    ['uploaded', 'a'.repeat(64)],
    ['requested', hash],
    ['rejected', hash],
  ])('rejects an occupied key (%s) without recording a replacement', async (status, content_hash) => {
    const tx = fakeTx({ status, content_hash });
    await expect(upload(tx)).rejects.toMatchObject({ code: 'FILE_NOT_REPLACEABLE' });
    expect(tx.query.mock.calls.some(([q]) => q.text.includes('record_file('))).toBe(false);
  });

  it('does not issue a reservation while a concurrent transaction holds the key', async () => {
    const tx = fakeTx(undefined, false);
    await expect(upload(tx)).rejects.toMatchObject({ code: 'FILE_NOT_REPLACEABLE' });
    expect(tx.query).toHaveBeenCalledTimes(1);
  });

  it('does not allocate a content-addressed key for other bytes', async () => {
    const tx = fakeTx();
    await expect(upload(tx, 'a'.repeat(64))).rejects.toMatchObject({ code: 'FILE_NOT_REPLACEABLE' });
    expect(tx.query).not.toHaveBeenCalled();
  });

  it('reuses a visible confirmed match without issuing write credentials', async () => {
    await expect(upload(fakeTx({ status: 'processed', content_hash: hash }))).resolves.toMatchObject({
      fileId: OLD_FILE_ID, deduplicated: true, uploadUrl: null, uploadHeaders: null,
    });
  });

  it('rejects an occupied object even without a visible file record', async () => {
    jest.mocked(headObject).mockResolvedValueOnce({ contentLength: 16 });
    const tx = fakeTx();
    await expect(upload(tx)).rejects.toMatchObject({ code: 'FILE_NOT_REPLACEABLE' });
    expect(tx.query.mock.calls.some(([q]) => q.text.includes('record_file('))).toBe(false);
  });

  it('issues upload credentials for an available key', async () => {
    await expect(upload(fakeTx())).resolves.toMatchObject({
      fileId: NEW_FILE_ID, deduplicated: false, uploadHeaders: { 'x-amz-meta-upload-id': NEW_FILE_ID },
    });
  });
});
