import type { FileProjection } from './types';

export type { FileProjection } from './types';

/**
 * Build the document stored in a managed image/upload column. Its id identifies
 * the files row for downloadUrl lookup and storage garbage collection.
 */
export function buildFileProjection(
  file: { id: string; key: string; bucketId: string; mime: string; size: number; filename?: string | null },
): FileProjection {
  const projection: FileProjection = {
    id: file.id,
    key: file.key,
    bucket_id: file.bucketId,
    mime: file.mime,
    size: file.size,
  };
  if (file.filename) projection.filename = file.filename;

  return projection;
}
