/**
 * Runtime dynamic storage client.
 *
 * Discovers a database's storage planes from `_meta`, builds upload documents
 * dynamically, and runs the presigned upload orchestration
 * (hash → mutation → PUT) — the caller never names a mutation, input type, or
 * bucket query field.
 */

import type { FileInput, GraphQLExecutor } from '@constructive-io/upload-client';
import { hashFile, putToPresignedUrl, UploadError } from '@constructive-io/upload-client';

import { buildUploadDocument } from './document';
import type { StorageMetaResult } from './meta';
import { findStorageSurface, resolveStorageSurfaces, STORAGE_META_QUERY } from './meta';
import type { StorageSurface, StorageSurfaceSelector } from './types';

export interface StorageUploadOptions {
  /** The file to upload (browser File object or compatible) */
  file: FileInput;
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
  /** The S3 object key */
  key: string;
  /** Whether this file was deduplicated (no bytes uploaded) */
  deduplicated: boolean;
  /** Presigned URL expiry time (null if deduplicated) */
  expiresAt: string | null;
  /** ID of the previous version (when uploading a new version of a custom-keyed file) */
  previousVersionId: string | null;
}

export interface StorageClientOptions {
  /** GraphQL executor — the only integration point with your GraphQL client */
  execute: GraphQLExecutor;
}

export interface StorageClient {
  /** Discover every storage plane from `_meta` (cached after the first call) */
  discover(): Promise<StorageSurface[]>;
  /** Resolve exactly one storage plane by semantic coordinates */
  surface(selector: StorageSurfaceSelector): Promise<StorageSurface>;
  /** Upload a file to a plane: hash → dynamic upload mutation → presigned PUT */
  upload(selector: StorageSurfaceSelector, options: StorageUploadOptions): Promise<StorageUploadResult>;
}

export function createStorageClient(options: StorageClientOptions): StorageClient {
  const { execute } = options;
  let cachedSurfaces: StorageSurface[] | null = null;

  async function discover(): Promise<StorageSurface[]> {
    if (cachedSurfaces) return cachedSurfaces;
    const result = (await execute(STORAGE_META_QUERY, {})) as unknown as StorageMetaResult;
    cachedSurfaces = resolveStorageSurfaces(result);
    return cachedSurfaces;
  }

  async function surface(selector: StorageSurfaceSelector): Promise<StorageSurface> {
    return findStorageSurface(await discover(), selector);
  }

  async function upload(
    selector: StorageSurfaceSelector,
    uploadOptions: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    const { file, bucketKey, key, isPublic, ownerId, signal } = uploadOptions;

    if (!file) {
      throw new UploadError('INVALID_FILE', 'No file provided');
    }
    if (file.size <= 0) {
      throw new UploadError('INVALID_FILE', 'File is empty');
    }

    const plane = await surface(selector);

    if (plane.upload.requiresOwnerId && !ownerId) {
      throw new UploadError(
        'INVALID_FILE',
        `Storage plane ${plane.filesType} is entity-keyed and requires ownerId`,
      );
    }

    checkAborted(signal);

    const contentHash = await hashFile(file);

    checkAborted(signal);

    const document = buildUploadDocument(plane);
    const input: Record<string, unknown> = {
      contentHash,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      filename: file.name || undefined,
    };
    if (bucketKey !== undefined) input.bucketKey = bucketKey;
    if (key !== undefined) input.key = key;
    if (isPublic !== undefined) input.isPublic = isPublic;
    if (ownerId !== undefined) input.ownerId = ownerId;

    let data: Record<string, unknown>;
    try {
      data = await execute(document, { input });
    } catch (err) {
      if (err instanceof UploadError) throw err;
      throw new UploadError(
        'REQUEST_UPLOAD_URL_FAILED',
        `${plane.upload.mutation} mutation failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }

    const payload = data?.[plane.upload.mutation] as StorageUploadResult & { uploadUrl: string | null };
    if (!payload) {
      throw new UploadError(
        'REQUEST_UPLOAD_URL_FAILED',
        `No data returned from ${plane.upload.mutation}`,
      );
    }

    if (payload.deduplicated) {
      return toResult(payload);
    }

    if (!payload.uploadUrl) {
      throw new UploadError(
        'REQUEST_UPLOAD_URL_FAILED',
        'Server returned deduplicated=false but no uploadUrl',
      );
    }

    checkAborted(signal);

    const body = await file.arrayBuffer();
    await putToPresignedUrl(payload.uploadUrl, body, file.type || 'application/octet-stream', signal);

    return toResult(payload);
  }

  return { discover, surface, upload };
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
    throw new UploadError('ABORTED', 'Upload was cancelled');
  }
}
