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
 * - `uploadFile` — full upload orchestrator (hash → request → PUT)
 *
 * Framework-agnostic, works in any browser or Node.js 18+ environment.
 * Uses @constructive-io/fetch for isomorphic HTTP (handles *.localhost DNS in Node.js).
 *
 * @example
 * ```typescript
 * import { uploadFile, hashFile, hashContent, putToPresignedUrl } from '@constructive-io/upload-client';
 *
 * // Full orchestrated upload
 * const result = await uploadFile({
 *   file: selectedFile,
 *   bucketKey: 'avatars',
 *   execute: myGraphQLExecutor,
 * });
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
export { fetchFromUrl,putToPresignedUrl } from './put';

// Orchestrator
export { uploadFile } from './upload';

// Adapter for the dynamic storage client's StorageTransport port
export type { StorageTransportPort } from './storage-transport';
export { createStorageTransport, storageTransport } from './storage-transport';

// GraphQL query builders (for custom integrations)
export { buildRequestUploadUrlQuery, DEFAULT_BUCKET_QUERY_FIELD,REQUEST_UPLOAD_URL_MUTATION, REQUEST_UPLOAD_URL_QUERY } from './queries';

// Types
export type {
  FileInput,
  GraphQLExecutor,
  RequestUploadUrlInput,
  RequestUploadUrlPayload,
  UploadErrorCode,
  UploadFileOptions,
  UploadResult,
} from './types';
export { UploadError } from './types';
