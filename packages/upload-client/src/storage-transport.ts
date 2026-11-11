/**
 * Adapter exposing this package's byte-level primitives as the
 * `StorageTransport` port that the dynamic storage client
 * (`@constructive-io/graphql-query`) consumes.
 *
 * Structural typing keeps the dependency one-way: nothing is imported from
 * the GraphQL side.
 */

import { hashFile } from './hash';
import { putToPresignedUrl } from './put';
import type { FileInput } from './types';

export interface StorageTransportPort {
  hashFile(file: FileInput): Promise<string>;
  /**
   * PUT the bytes to a presigned URL. `contentHash` is the hex SHA-256 the
   * URL was requested with; it is sent as the signed `x-amz-checksum-sha256`.
   * `headers` are the payload's `uploadHeaders`; when given they are sent as-is.
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

/** The presigned-URL transport: SHA-256 hashing plus a checksum-bound presigned PUT. */
export const storageTransport: StorageTransportPort = {
  hashFile: (file) => hashFile(file),
  putObject: async (url, body, contentType, signal, contentHash, headers) => {
    await putToPresignedUrl(url, body, contentType, { signal, contentHash, headers });
  },
};

export function createStorageTransport(): StorageTransportPort {
  return storageTransport;
}
