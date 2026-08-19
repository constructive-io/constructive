export type { StorageClient, StorageClientOptions } from './client';
export { createStorageClient } from './client';
export { buildDownloadUrlDocument, buildUploadDocument } from './document';
export type { StorageMetaResult } from './meta';
export { findStorageSurface, resolveStorageSurfaces, STORAGE_META_QUERY } from './meta';
export type {
  GraphQLExecutor,
  StorageErrorCode,
  StorageFile,
  StorageTransport,
} from './transport';
export { StorageError } from './transport';
export type {
  StorageSurface,
  StorageSurfaceSelector,
  StorageTableRef,
  StorageUploadSurface,
} from './types';
export type {
  StorageUploadOptions,
  StorageUploadResult,
  UploadToSurfaceContext,
} from './upload';
export { uploadToSurface } from './upload';
