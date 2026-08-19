export type {
  StorageClient,
  StorageClientOptions,
  StorageUploadOptions,
  StorageUploadResult,
} from './client';
export { createStorageClient } from './client';
export { buildDownloadUrlDocument, buildUploadDocument } from './document';
export type { StorageMetaResult } from './meta';
export { findStorageSurface, resolveStorageSurfaces, STORAGE_META_QUERY } from './meta';
export type {
  StorageSurface,
  StorageSurfaceSelector,
  StorageTableRef,
  StorageUploadSurface,
} from './types';
