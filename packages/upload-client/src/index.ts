/**
 * @constructive-io/upload-client
 *
 * Client-side presigned URL upload utilities for Constructive.
 *
 * Provides atomic functions for the presigned URL upload pipeline:
 * - `hashFile` — SHA-256 hash via Web Crypto API
 * - `hashFileChunked` — chunked SHA-256 for large files
 * - `uploadFile` — full upload orchestrator (hash → request → PUT → confirm)
 *
 * Framework-agnostic, works in any browser or Node.js 18+ environment.
 *
 * @example
 * ```typescript
 * import { uploadFile, hashFile } from '@constructive-io/upload-client';
 *
 * // Full orchestrated upload
 * const result = await uploadFile({
 *   file: selectedFile,
 *   bucketKey: 'avatars',
 *   execute: myGraphQLExecutor,
 * });
 *
 * // Or use atomic functions individually
 * const hash = await hashFile(myFile);
 * ```
 */

// Atomic functions
export { hashFile, hashFileChunked } from './hash';

// Orchestrator
export { uploadFile } from './upload';

// GraphQL query strings (for custom integrations)
export { REQUEST_UPLOAD_URL_MUTATION, CONFIRM_UPLOAD_MUTATION } from './queries';

// Types
export type {
  FileInput,
  GraphQLExecutor,
  UploadFileOptions,
  UploadResult,
  RequestUploadUrlInput,
  RequestUploadUrlPayload,
  ConfirmUploadInput,
  ConfirmUploadPayload,
  UploadErrorCode,
} from './types';

export { UploadError } from './types';
