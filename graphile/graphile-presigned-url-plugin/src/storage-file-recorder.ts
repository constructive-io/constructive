import { ConstructiveError } from '@constructive-io/errors';

import type { StorageModuleConfig } from './types';

interface RecordManagedFileInput {
  bucketId: string;
  /** Logical replacement/dedup slot; the recorder allocates the physical key. */
  key: string;
  contentHash: string;
  mimeType: string;
  size: number;
  filename: string | null | undefined;
  path?: string | null;
}

/**
 * Record a managed file through the storage plane's generated recorder.
 *
 * The recorder owns the files-table insert so bucket inheritance and claims
 * attribution run at the database boundary. Optional arguments are only named
 * when the generated function supports them and the caller has a value. A
 * version's previous_version_id is not an argument: a version chain is written
 * only by a platform writer, and a custom key has none — a re-upload at a key
 * replaces the row at it only after successful confirmation. The returned key
 * is the server-allocated physical location, never input.key.
 */
export async function recordManagedFile(
  pgClient: { query: (opts: { text: string; values: unknown[] }) => Promise<{ rows: unknown[] }> },
  storageConfig: StorageModuleConfig,
  input: RecordManagedFileInput,
): Promise<{ id: string; key: string }> {
  if (!storageConfig.recorderQualifiedName) {
    throw new Error(
      `STORAGE_RECORDER_MISSING: storage module ${storageConfig.id} (${storageConfig.filesTableName}) ` +
      `must expose ${storageConfig.filesTableName}_record_file in its private schema`,
    );
  }
  if (input.path != null && !storageConfig.hasPathShares) {
    throw new Error(
      `STORAGE_PATH_SHARES_UNSUPPORTED: storage module ${storageConfig.id} (${storageConfig.filesTableName}) ` +
      'does not support path',
    );
  }

  const args = [
    'bucket_id := $1::uuid',
    'key := $2::text',
    'content_hash := $3::text',
    'mime_type := $4::text',
    'size := $5::bigint',
    'filename := $6::text',
    'upload := $7::jsonb',
  ];
  const values: unknown[] = [
    input.bucketId,
    input.key,
    input.contentHash,
    input.mimeType,
    input.size,
    input.filename ?? null,
    null,
  ];

  if (storageConfig.hasPathShares && input.path != null) {
    args.push(`path := $${values.length + 1}::text`);
    values.push(input.path);
  }

  const result = await pgClient.query({
    text: `SELECT id, key FROM ${storageConfig.recorderQualifiedName}(${args.join(', ')})`,
    values,
  });
  const row = result.rows[0] as { id?: unknown; key?: unknown } | undefined;
  if (!row || typeof row.id !== 'string' || !row.id ||
      typeof row.key !== 'string' || !row.key || row.key === input.key) {
    throw new ConstructiveError({
      code: 'INTERNAL_ERROR',
      message: 'Storage recorder did not allocate an independent object identity',
      errorClass: 'internal',
      http: 500,
      context: { storageModuleId: storageConfig.id },
    });
  }
  return { id: row.id, key: row.key };
}
