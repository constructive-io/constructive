/**
 * File input and error types for the upload client's byte-level utilities.
 */

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
  | 'PUT_UPLOAD_FAILED'
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
