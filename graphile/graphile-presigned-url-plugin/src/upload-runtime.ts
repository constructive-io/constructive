import { log } from './logger';
import { generatePresignedPutUrl } from './s3-signer';
import type {
  BucketConfig,
  PresignedUrlPluginOptions,
  S3Config,
  StorageModuleConfig,
} from './types';

const MAX_CONTENT_HASH_LENGTH = 128;
const MAX_CONTENT_TYPE_LENGTH = 255;
const MAX_CUSTOM_KEY_LENGTH = 1024;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const CUSTOM_KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.\-\/]*$/;

function isValidSha256(hash: string): boolean {
  return SHA256_HEX_REGEX.test(hash);
}

function buildS3Key(contentHash: string): string {
  return contentHash;
}

function validateCustomKey(key: string): string | null {
  if (key.length === 0 || key.length > MAX_CUSTOM_KEY_LENGTH) {
    return 'INVALID_KEY_LENGTH: must be 1-1024 characters';
  }
  if (key.includes('..')) {
    return 'INVALID_KEY: path traversal (..) not allowed';
  }
  if (key.startsWith('/')) {
    return 'INVALID_KEY: leading slash not allowed';
  }
  if (key.includes('\0')) {
    return 'INVALID_KEY: null bytes not allowed';
  }
  if (!CUSTOM_KEY_REGEX.test(key)) {
    return 'INVALID_KEY: must start with alphanumeric and contain only alphanumeric, dots, hyphens, underscores, and slashes';
  }
  return null;
}

function derivePathFromKey(key: string): string | null {
  const lastSlash = key.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  const dir = key.substring(0, lastSlash);
  return dir.replace(/\//g, '.');
}

/**
 * Validate, deduplicate, persist, and sign one upload inside the caller's
 * transaction. Graphile field construction stays in the plugin; this module
 * owns the storage runtime shared by single and bulk upload mutations.
 */
export async function processSingleFile(
  options: PresignedUrlPluginOptions,
  txClient: any,
  storageConfig: StorageModuleConfig,
  databaseId: string,
  bucket: BucketConfig,
  s3ForDb: S3Config,
  input: any
) {
  const { contentHash, contentType, size, filename, key: customKey } = input;

  if (
    !contentHash ||
    typeof contentHash !== 'string' ||
    contentHash.length > MAX_CONTENT_HASH_LENGTH
  ) {
    throw new Error('INVALID_CONTENT_HASH');
  }
  if (!isValidSha256(contentHash)) {
    throw new Error(
      'INVALID_CONTENT_HASH_FORMAT: must be a 64-char lowercase hex SHA-256'
    );
  }
  if (
    !contentType ||
    typeof contentType !== 'string' ||
    contentType.length > MAX_CONTENT_TYPE_LENGTH
  ) {
    throw new Error('INVALID_CONTENT_TYPE');
  }
  if (
    typeof size !== 'number' ||
    size <= 0 ||
    size > storageConfig.defaultMaxFileSize
  ) {
    throw new Error(
      `INVALID_FILE_SIZE: must be between 1 and ${storageConfig.defaultMaxFileSize} bytes`
    );
  }
  if (filename !== undefined && filename !== null) {
    if (
      typeof filename !== 'string' ||
      filename.length > storageConfig.maxFilenameLength
    ) {
      throw new Error('INVALID_FILENAME');
    }
  }

  // Validate content type against bucket's allowed_mime_types
  if (bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0) {
    const allowed = bucket.allowed_mime_types as string[];
    const isAllowed = allowed.some((pattern: string) => {
      if (pattern === '*/*') return true;
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1);
        return contentType.startsWith(prefix);
      }
      return contentType === pattern;
    });
    if (!isAllowed) {
      throw new Error(
        `CONTENT_TYPE_NOT_ALLOWED: ${contentType} not in bucket allowed types`
      );
    }
  }

  // Validate size against bucket's max_file_size
  if (bucket.max_file_size && size > bucket.max_file_size) {
    throw new Error(
      `FILE_TOO_LARGE: exceeds bucket max of ${bucket.max_file_size} bytes`
    );
  }

  // Determine S3 key
  let s3Key: string;
  let isCustomKey = false;
  if (customKey) {
    if (!bucket.allow_custom_keys) {
      throw new Error(
        'CUSTOM_KEY_NOT_ALLOWED: bucket does not allow custom keys'
      );
    }
    const keyError = validateCustomKey(customKey);
    if (keyError) {
      throw new Error(keyError);
    }
    s3Key = customKey;
    isCustomKey = true;
  } else {
    s3Key = buildS3Key(contentHash);
  }

  // Dedup / versioning check
  let previousVersionId: string | null = null;

  if (isCustomKey) {
    const existingResult = await txClient.query({
      text: `SELECT id, content_hash
       FROM ${storageConfig.filesQualifiedName}
       WHERE key = $1
         AND bucket_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      values: [s3Key, bucket.id],
    });

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      if (existing.content_hash === contentHash) {
        log.info(
          `Dedup hit (custom key): file ${existing.id} for key ${s3Key}`
        );
        return {
          uploadUrl: null as string | null,
          fileId: existing.id as string,
          key: s3Key,
          deduplicated: true,
          expiresAt: null as string | null,
          previousVersionId: null as string | null,
        };
      }
      previousVersionId = existing.id;
      log.info(
        `Versioning: new version of key ${s3Key}, previous=${previousVersionId}`
      );
    }
  } else {
    const dedupResult = await txClient.query({
      text: `SELECT id
       FROM ${storageConfig.filesQualifiedName}
       WHERE content_hash = $1
         AND bucket_id = $2
       LIMIT 1`,
      values: [contentHash, bucket.id],
    });

    if (dedupResult.rows.length > 0) {
      const existingFile = dedupResult.rows[0];
      log.info(`Dedup hit: file ${existingFile.id} for hash ${contentHash}`);

      return {
        uploadUrl: null as string | null,
        fileId: existingFile.id as string,
        key: s3Key,
        deduplicated: true,
        expiresAt: null as string | null,
        previousVersionId: null as string | null,
      };
    }
  }

  // Auto-derive ltree path from custom key directory (only when has_path_shares)
  const derivedPath =
    isCustomKey && storageConfig.hasPathShares
      ? derivePathFromKey(s3Key)
      : null;

  // Create file record
  const hasOwnerColumn = storageConfig.scope !== 'app';
  const columns = [
    'bucket_id',
    'key',
    'content_hash',
    'mime_type',
    'size',
    'filename',
    'is_public',
  ];
  const values: any[] = [
    bucket.id,
    s3Key,
    contentHash,
    contentType,
    size,
    filename || null,
    bucket.is_public,
  ];

  if (hasOwnerColumn) {
    columns.push('owner_id');
    values.push(bucket.owner_id);
  }
  if (previousVersionId) {
    columns.push('previous_version_id');
    values.push(previousVersionId);
  }
  if (derivedPath) {
    columns.push('path');
    values.push(derivedPath);
  }

  const placeholders = values
    .map((_: any, i: number) => `$${i + 1}`)
    .join(', ');
  const fileResult = await txClient.query({
    text: `INSERT INTO ${storageConfig.filesQualifiedName}
           (${columns.join(', ')})
           VALUES (${placeholders})
           RETURNING id`,
    values,
  });

  const fileId = fileResult.rows[0].id;

  // Generate presigned PUT URL
  const uploadUrl = await generatePresignedPutUrl(
    s3ForDb,
    s3Key,
    contentType,
    size,
    storageConfig.uploadUrlExpirySeconds
  );

  const expiresAt = new Date(
    Date.now() + storageConfig.uploadUrlExpirySeconds * 1000
  ).toISOString();

  return {
    uploadUrl,
    fileId,
    key: s3Key,
    deduplicated: false,
    expiresAt,
    previousVersionId,
  };
}
