/**
 * Upload orchestration for one already-resolved storage plane:
 * hash → dynamic upload mutation → presigned PUT.
 *
 * Standalone on purpose — callers that resolved a surface themselves can use
 * this without the client wrapper, and the byte-level work is an injected
 * `StorageTransport`.
 */

import { buildUploadDocument } from './document';
import type { GraphQLExecutor, StorageFile, StorageTransport } from './transport';
import { StorageError } from './transport';
import type { StorageSurface } from './types';

export interface StorageUploadOptions {
  /** The file to upload (browser File object or compatible) */
  file: StorageFile;
  /** Bucket key within the plane (omit to use the plane's default bucket) */
  bucketKey?: string;
  /** Custom object key (enables versioning of the same key) */
  key?: string;
  /** Whether the file should be publicly readable */
  isPublic?: boolean;
  /** Owner identity — required when the plane is entity-keyed */
  ownerId?: string;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface StorageUploadResult {
  /** The file ID (UUID) */
  fileId: string;
  /** The object key */
  key: string;
  /** Whether this file was deduplicated (no bytes uploaded) */
  deduplicated: boolean;
  /** Presigned URL expiry time (null if deduplicated) */
  expiresAt: string | null;
  /** ID of the previous version (when uploading a new version of a custom-keyed file) */
  previousVersionId: string | null;
}

export interface UploadToSurfaceContext {
  execute: GraphQLExecutor;
  transport: StorageTransport;
}

export async function uploadToSurface(
  surface: StorageSurface,
  options: StorageUploadOptions,
  context: UploadToSurfaceContext,
): Promise<StorageUploadResult> {
  const { execute, transport } = context;
  const { file, bucketKey, key, isPublic, ownerId, signal } = options;

  if (!file) {
    throw new StorageError('INVALID_FILE', 'No file provided');
  }
  if (file.size <= 0) {
    throw new StorageError('INVALID_FILE', 'File is empty');
  }
  if (surface.upload.requiresOwnerId && !ownerId) {
    throw new StorageError(
      'OWNER_REQUIRED',
      `Storage plane ${surface.filesType} is entity-keyed and requires ownerId`,
    );
  }

  checkAborted(signal);
  const contentHash = await transport.hashFile(file);
  checkAborted(signal);

  const contentType = file.type || 'application/octet-stream';
  const input: Record<string, unknown> = {
    contentHash,
    contentType,
    size: file.size,
    filename: file.name || undefined,
  };
  if (bucketKey !== undefined) input.bucketKey = bucketKey;
  if (key !== undefined) input.key = key;
  if (isPublic !== undefined) input.isPublic = isPublic;
  if (ownerId !== undefined) input.ownerId = ownerId;

  let data: Record<string, unknown>;
  try {
    data = await execute(buildUploadDocument(surface), { input });
  } catch (err) {
    throw new StorageError(
      'UPLOAD_MUTATION_FAILED',
      `${surface.upload.mutation} mutation failed: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const payload = data?.[surface.upload.mutation] as
    | (StorageUploadResult & { uploadUrl: string | null })
    | undefined;
  if (!payload) {
    throw new StorageError(
      'UPLOAD_MUTATION_FAILED',
      `No data returned from ${surface.upload.mutation}`,
    );
  }

  if (payload.deduplicated) {
    return toResult(payload);
  }
  if (!payload.uploadUrl) {
    throw new StorageError(
      'UPLOAD_MUTATION_FAILED',
      'Server returned deduplicated=false but no uploadUrl',
    );
  }

  checkAborted(signal);
  await transport.putObject(payload.uploadUrl, await file.arrayBuffer(), contentType, signal);

  return toResult(payload);
}

function toResult(payload: StorageUploadResult): StorageUploadResult {
  return {
    fileId: payload.fileId,
    key: payload.key,
    deduplicated: payload.deduplicated,
    expiresAt: payload.expiresAt ?? null,
    previousVersionId: payload.previousVersionId ?? null,
  };
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new StorageError('ABORTED', 'Upload was cancelled');
  }
}
