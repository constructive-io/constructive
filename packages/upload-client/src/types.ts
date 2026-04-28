/**
 * Types for the upload client.
 *
 * These mirror the GraphQL mutation input/output types from
 * graphile-presigned-url-plugin, but are pure TypeScript —
 * no GraphQL dependency needed.
 */

// --- GraphQL mutation types ---

export interface RequestUploadUrlInput {
  /** Bucket key (e.g., "public", "private", "avatars") */
  bucketKey: string;
  /** SHA-256 content hash, hex-encoded, 64 chars */
  contentHash: string;
  /** MIME type (e.g., "image/png") */
  contentType: string;
  /** File size in bytes */
  size: number;
  /** Original filename (optional) */
  filename?: string;
}

export interface RequestUploadUrlPayload {
  /** Presigned PUT URL (null if deduplicated) */
  uploadUrl: string | null;
  /** The file ID (UUID) */
  fileId: string;
  /** The S3 object key */
  key: string;
  /** Whether this file was deduplicated */
  deduplicated: boolean;
  /** Presigned URL expiry time (ISO string, null if deduplicated) */
  expiresAt: string | null;
  /** File status — 'pending' for fresh uploads, 'ready' or 'processed' for deduplicated files */
  status: string;
}

export interface ConfirmUploadInput {
  /** The file ID returned by requestUploadUrl */
  fileId: string;
}

export interface ConfirmUploadPayload {
  /** The confirmed file ID */
  fileId: string;
  /** New file status (e.g., "ready") */
  status: string;
  /** Whether confirmation succeeded */
  success: boolean;
}

// --- Client options ---

/**
 * Function that executes a GraphQL mutation and returns the result data.
 *
 * This is the only integration point with your GraphQL client.
 * Works with any client (urql, Apollo, fetch-based, etc.).
 *
 * @example
 * // Using fetch:
 * const executeMutation: GraphQLExecutor = async (query, variables) => {
 *   const res = await fetch('/graphql', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', ...authHeaders },
 *     body: JSON.stringify({ query, variables }),
 *   });
 *   const json = await res.json();
 *   if (json.errors?.length) throw new UploadError('GRAPHQL_ERROR', json.errors[0].message);
 *   return json.data;
 * };
 */
export type GraphQLExecutor = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface UploadFileOptions {
  /** The file to upload (browser File object or compatible) */
  file: FileInput;
  /** Bucket key (e.g., "public", "private", "avatars") */
  bucketKey: string;
  /** GraphQL executor function */
  execute: GraphQLExecutor;
  /** Progress callback (0-100) — only fires during the S3 PUT */
  onProgress?: (percent: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface UploadResult {
  /** The file ID (UUID) — use this to link to domain tables */
  fileId: string;
  /** The S3 object key */
  key: string;
  /** Whether this file was deduplicated (no bytes uploaded) */
  deduplicated: boolean;
  /** File status after upload ("ready" for fresh uploads, existing status for dedup) */
  status: string;
}

// --- File input abstraction ---

/**
 * Minimal file interface for hashing and uploading.
 * Compatible with browser `File`, Node.js `Blob`, and custom implementations.
 */
export interface FileInput {
  /** File name */
  readonly name: string;
  /** File size in bytes */
  readonly size: number;
  /** MIME type */
  readonly type: string;
  /** Read the entire file as an ArrayBuffer */
  arrayBuffer(): Promise<ArrayBuffer>;
  /** Read a slice of the file */
  slice(start?: number, end?: number): Blob;
}

// --- Error types ---

export type UploadErrorCode =
  | 'HASH_FAILED'
  | 'INVALID_FILE'
  | 'GRAPHQL_ERROR'
  | 'REQUEST_UPLOAD_URL_FAILED'
  | 'PUT_UPLOAD_FAILED'
  | 'CONFIRM_UPLOAD_FAILED'
  | 'ABORTED';

export class UploadError extends Error {
  readonly code: UploadErrorCode;
  readonly cause?: unknown;

  constructor(code: UploadErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.cause = cause;
  }
}
