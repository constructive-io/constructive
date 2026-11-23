/**
 * Re-uploading changed bytes under a custom key.
 *
 * A custom key is one object with no version chain: the new row is recorded
 * beside the current one and the database replaces the current row when the
 * upload is confirmed, whatever the module's versioning or content-hash flags.
 * The resolver deletes nothing and links nothing. The database is faked at the
 * query boundary and presigning is stubbed, so these pin which statements the
 * resolver issues.
 */

import { processSingleFile } from '../src/plugin';
import { generatePresignedPutUrl } from '../src/s3-signer';
import type { BucketConfig, PresignedUrlPluginOptions, S3Config, StorageModuleConfig } from '../src/types';

jest.mock('../src/s3-signer', () => ({
  ...jest.requireActual('../src/s3-signer'),
  generatePresignedPutUrl: jest.fn().mockResolvedValue('https://s3.example.com/put'),
}));

const BUCKET_ID = '33333333-3333-3333-3333-333333333333';
const OLD_FILE_ID = '44444444-4444-4444-4444-444444444444';
const NEW_FILE_ID = '55555555-5555-5555-5555-555555555555';
const KEY = 'index.html';
const OLD_KEY = `originals/${OLD_FILE_ID}`;
const NEW_KEY = `originals/${NEW_FILE_ID}`;

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

function fakeTx(existingHash: string, deletable = true, existingStatus = 'uploaded') {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const txClient = {
    async query(opts: { text: string; values: unknown[] }) {
      queries.push(opts);
      if (/^SELECT id, (?:key|status)/.test(opts.text) && !/record_file\(/.test(opts.text)) {
        // The probe is by (key, bucket, hash): a row carrying other bytes is not seen.
        const probedHash = opts.values[2];
        return { rows: probedHash === existingHash && ['uploaded', 'processed'].includes(existingStatus) ? [{ id: OLD_FILE_ID, key: OLD_KEY, status: existingStatus }] : [] };
      }
      if (/^DELETE FROM storage_public\.app_files/.test(opts.text)) {
        return { rows: deletable ? [{ id: OLD_FILE_ID }] : [] };
      }
      if (/record_file\(/.test(opts.text)) return { rows: [{ id: NEW_FILE_ID, key: NEW_KEY }] };
      throw new Error(`unexpected query: ${opts.text}`);
    },
  };
  return { txClient, queries };
}

const upload = (storage: StorageModuleConfig, txClient: unknown) =>
  processSingleFile(options, txClient, storage, 'db', bucket, s3, {
    contentHash: 'b'.repeat(64),
    contentType: 'text/html',
    size: 16,
    filename: KEY,
    key: KEY,
  });

describe('custom-key upload of changed bytes', () => {
  it.each([
    ['no versioning, no content hash', {}],
    ['content-addressed without versioning', { hasContentHash: true }],
    ['versioned', { hasVersioning: true, hasContentHash: true }],
  ])('records the new row beside the current one and leaves the replacement to the database (%s)', async (_shape, flags) => {
    const { txClient, queries } = fakeTx('a'.repeat(64));

    const result = await upload(storageConfig(flags), txClient);

    expect(result).toMatchObject({
      fileId: NEW_FILE_ID,
      key: NEW_KEY,
      deduplicated: false,
      uploadUrl: 'https://s3.example.com/put',
    });
    expect(result).not.toHaveProperty('previousVersionId');
    expect(queries.map((q) => q.text.trim().split(/\s+/)[0])).toEqual(['SELECT', 'SELECT']);
    expect(queries[0].values).toEqual([KEY, BUCKET_ID, 'b'.repeat(64)]);
    const record = queries[1];
    expect(record.text).toContain('record_file(');
    expect(record.text).not.toContain('previous_version_id');
    expect(record.values).toContain(KEY);
    expect(record.values).not.toContain(OLD_FILE_ID);
  });

  it('restarts an upload whose identical bytes never landed', async () => {
    const { txClient, queries } = fakeTx('b'.repeat(64), true, 'requested');

    const result = await upload(storageConfig(), txClient);

    expect(result).toMatchObject({ fileId: NEW_FILE_ID, deduplicated: false });
    expect(queries.map((q) => q.text.trim().split(/\s+/)[0])).toEqual(['SELECT', 'SELECT']);
    expect(result.key).toBe(NEW_KEY);
    expect(queries.some((q) => /^DELETE/.test(q.text))).toBe(false);
  });

  it('retries independently even when the caller cannot delete an earlier attempt', async () => {
    const { txClient, queries } = fakeTx('b'.repeat(64), false, 'requested');
    await expect(upload(storageConfig(), txClient)).resolves.toMatchObject({ key: NEW_KEY, deduplicated: false });
    expect(queries.some((q) => /^DELETE/.test(q.text))).toBe(false);
  });

  it.each(['a'.repeat(64), OLD_KEY, `derived/${OLD_KEY}/thumb.webp`])(
    'never signs the attacker-selected logical key %s', async (logicalKey) => {
      const { txClient } = fakeTx('a'.repeat(64));
      const result = await processSingleFile(options, txClient, storageConfig(), 'db', bucket, s3, {
        contentHash: 'b'.repeat(64), contentType: 'text/html', size: 16, key: logicalKey,
      });
      expect(result.key).toBe(NEW_KEY);
      expect(result.file.key).toBe(NEW_KEY);
      expect(generatePresignedPutUrl).toHaveBeenLastCalledWith(s3, NEW_KEY, 'text/html', 16, 900, 'b'.repeat(64), NEW_FILE_ID);
    },
  );

  it('deduplicates identical bytes at the key without touching the row', async () => {
    const { txClient, queries } = fakeTx('b'.repeat(64));

    const result = await upload(storageConfig(), txClient);

    expect(result).toMatchObject({ fileId: OLD_FILE_ID, deduplicated: true, uploadUrl: null });
    expect(queries).toHaveLength(1);
  });
});
