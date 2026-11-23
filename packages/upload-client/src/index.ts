/**
 * @constructive-io/upload-client
 *
 * Client-side presigned URL upload utilities for Constructive.
 *
 * Provides atomic functions for the presigned URL upload pipeline:
 * - `hashFile` — SHA-256 hash (File/Blob, one-shot)
 * - `hashFileChunked` — true incremental SHA-256 for large files (GB+)
 * - `hashContent` — SHA-256 hash for plain strings
 * - `putToPresignedUrl` — PUT bytes to a presigned S3 URL
 * - `fetchFromUrl` — GET from a presigned or CDN URL
 *
 * For upload orchestration, use `createStorageClient` from
 * `@constructive-io/graphql-query` with this package's `storageTransport`.
 * It discovers per-files-table upload mutations from the server's `_meta`.
 *
 * Framework-agnostic, works in any browser or Node.js 18+ environment.
 * Uses @constructive-io/fetch for isomorphic HTTP (handles *.localhost DNS in Node.js).
 *
 * @example
 * ```typescript
 * import { createStorageClient } from '@constructive-io/graphql-query';
 * import { storageTransport, hashFile, hashContent, putToPresignedUrl } from '@constructive-io/upload-client';
 *
 * // Full orchestrated upload
 * const storage = createStorageClient({
 *   execute: myGraphQLExecutor,
 *   transport: storageTransport,
 * });
 * const result = await storage.upload(
 *   { filesType: 'AppFile' },
 *   { file: selectedFile, bucketKey: 'avatars' },
 * );
 *
 * // Atomic functions for custom flows
 * const hash = await hashFile(myFile);
 * const contentHash = await hashContent('file contents');
 * await putToPresignedUrl(presignedUrl, content, 'image/png');
 * ```
 */

// Hashing
export { hashFile, hashFileChunked } from './hash';
export { hashContent } from './hash-content';

// Presigned URL helpers
export { CHECKSUM_SHA256_HEADER, presignedPutHeaders, sha256HexOfBody, sha256HexToBase64 } from './checksum';
export type { PutToPresignedUrlOptions } from './put';
export { fetchFromUrl,putToPresignedUrl } from './put';

// Adapter for the dynamic storage client's StorageTransport port
export type { StorageTransportPort } from './storage-transport';
export { createStorageTransport, storageTransport } from './storage-transport';

// Types
export type {
  FileInput,
  UploadErrorCode,
} from './types';
export { UploadError } from './types';
