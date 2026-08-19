/**
 * Canonical names of a storage plane's upload surface.
 *
 * The presigned-url plugin emits these fields and types; anything that reports
 * or consumes the surface (the `_meta` storage section, dynamic clients) must
 * derive the same names from the same inflection facts. This module is the one
 * definition of that derivation, so the emitter and the reporters cannot
 * disagree.
 */

import type { StorageCodec } from './pairing';

/**
 * The computed field the download plugin adds to every files type. One
 * definition so the emitter (download-url-field.ts) and the reporters
 * (`_meta`, dynamic clients) cannot disagree.
 */
export const DOWNLOAD_URL_FIELD = 'downloadUrl';

/** The slice of `build.inflection` the naming derivation reads. */
export interface StorageInflection {
  tableType(codec: StorageCodec): string;
}

/** The GraphQL names of one plane's upload surface. */
export interface UploadSurfaceNames {
  /** GraphQL type name of the files table (e.g. `AppFile`). */
  filesTypeName: string;
  /** Single upload mutation field (e.g. `uploadAppFile`). */
  uploadMutation: string;
  /** Input type of the single upload mutation (e.g. `UploadAppFileInput`). */
  uploadInputType: string;
  /** Payload type of the single upload mutation (e.g. `UploadAppFilePayload`). */
  uploadPayloadType: string;
  /** Bulk upload mutation field (e.g. `uploadAppFiles`). */
  bulkUploadMutation: string;
  /** Input type of the bulk upload mutation (e.g. `UploadAppFileBulkInput`). */
  bulkUploadInputType: string;
  /** Payload type of the bulk upload mutation (e.g. `UploadAppFileBulkPayload`). */
  bulkUploadPayloadType: string;
  /** Per-file input type inside the bulk input (e.g. `UploadAppFileBulkFileInput`). */
  bulkUploadFileInputType: string;
  /** Per-file payload type inside the bulk payload (e.g. `UploadAppFileBulkFilePayload`). */
  bulkUploadFilePayloadType: string;
}

/**
 * Derive the upload surface names for a plane's files codec.
 */
export function uploadSurfaceNames(
  inflection: StorageInflection,
  filesCodec: StorageCodec,
): UploadSurfaceNames {
  const filesTypeName = inflection.tableType(filesCodec);
  return {
    filesTypeName,
    uploadMutation: `upload${filesTypeName}`,
    uploadInputType: `Upload${filesTypeName}Input`,
    uploadPayloadType: `Upload${filesTypeName}Payload`,
    bulkUploadMutation: `upload${filesTypeName}s`,
    bulkUploadInputType: `Upload${filesTypeName}BulkInput`,
    bulkUploadPayloadType: `Upload${filesTypeName}BulkPayload`,
    bulkUploadFileInputType: `Upload${filesTypeName}BulkFileInput`,
    bulkUploadFilePayloadType: `Upload${filesTypeName}BulkFilePayload`,
  };
}
