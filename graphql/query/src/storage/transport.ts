/**
 * Ports the storage orchestration depends on.
 *
 * Byte-level concerns — hashing a file, PUTting it to a presigned URL — are
 * injected as an adapter rather than imported, so this package stays a
 * GraphQL discovery/document library with no upload or S3 dependency.
 * `@constructive-io/upload-client` ships an adapter satisfying
 * `StorageTransport`; any other implementation works equally well.
 */

/**
 * Minimal file interface for hashing and uploading.
 * Compatible with browser `File`, Node.js `Blob`, and custom implementations.
 */
export interface StorageFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Byte-level adapter: content hashing and presigned PUT. */
export interface StorageTransport {
  /** SHA-256 the file contents, hex-encoded */
  hashFile(file: StorageFile): Promise<string>;
  /**
   * PUT the bytes to a presigned URL. `contentHash` is the hex SHA-256 the
   * upload was requested with; the URL is signed over it as
   * `x-amz-checksum-sha256`, so the transport must send it. `headers` are the
   * payload's `uploadHeaders` — the exact headers the URL needs (checksum and
   * `x-amz-meta-upload-id` included); a transport sends them as-is when given.
   */
  putObject(
    url: string,
    body: ArrayBuffer,
    contentType: string,
    signal?: AbortSignal,
    contentHash?: string,
    headers?: Record<string, string>,
  ): Promise<void>;
}

/**
 * Executes a GraphQL operation and returns its `data`.
 * The only integration point with a GraphQL client.
 */
export type GraphQLExecutor = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export type StorageErrorCode =
  | 'INVALID_FILE'
  | 'OWNER_REQUIRED'
  | 'HASH_FAILED'
  | 'UPLOAD_MUTATION_FAILED'
  | 'PUT_UPLOAD_FAILED'
  | 'ABORTED';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}
