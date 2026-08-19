/**
 * Runtime dynamic storage client — a thin composition of the three modular
 * pieces: `_meta` discovery, document building, and upload orchestration.
 *
 * The caller never names a mutation, input type, or bucket query field.
 */

import type { StorageMetaResult } from './meta';
import { findStorageSurface, resolveStorageSurfaces, STORAGE_META_QUERY } from './meta';
import type { GraphQLExecutor, StorageTransport } from './transport';
import type { StorageSurface, StorageSurfaceSelector } from './types';
import type { StorageUploadOptions, StorageUploadResult } from './upload';
import { uploadToSurface } from './upload';

export interface StorageClientOptions {
  /** GraphQL executor — the only integration point with your GraphQL client */
  execute: GraphQLExecutor;
  /**
   * Byte-level adapter (hash + presigned PUT). Required for `upload()`;
   * omit it when you only need discovery or document building.
   */
  transport?: StorageTransport;
}

export interface StorageClient {
  /** Discover every storage plane from `_meta` (cached after the first call) */
  discover(): Promise<StorageSurface[]>;
  /** Resolve exactly one storage plane by semantic coordinates */
  surface(selector: StorageSurfaceSelector): Promise<StorageSurface>;
  /** Upload a file to a plane: hash → dynamic upload mutation → presigned PUT */
  upload(
    selector: StorageSurfaceSelector,
    options: StorageUploadOptions,
  ): Promise<StorageUploadResult>;
}

export function createStorageClient(options: StorageClientOptions): StorageClient {
  const { execute, transport } = options;
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
    if (!transport) {
      throw new Error(
        'STORAGE_TRANSPORT_MISSING: createStorageClient({ transport }) is required to upload; ' +
          'pass the adapter from @constructive-io/upload-client or your own StorageTransport',
      );
    }
    return uploadToSurface(await surface(selector), uploadOptions, { execute, transport });
  }

  return { discover, surface, upload };
}
