import type { StorageModuleConfig } from './types';

interface RecordManagedFileInput {
  bucketId: string;
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
 * version's previous_version_id is not an argument: the files table derives it
 * from the head at the key, under the caller's own RLS.
 */
export async function recordManagedFile(
  pgClient: { query: (opts: { text: string; values: unknown[] }) => Promise<{ rows: unknown[] }> },
  storageConfig: StorageModuleConfig,
  input: RecordManagedFileInput,
): Promise<string> {
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
    text: `SELECT id FROM ${storageConfig.recorderQualifiedName}(${args.join(', ')})`,
    values,
  });
  return (result.rows[0] as { id: string }).id;
}
