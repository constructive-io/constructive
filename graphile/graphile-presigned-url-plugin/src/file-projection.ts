/**
 * The projection document a managed `image`/`upload` column stores.
 *
 * A presigned upload creates the files row; the column then carries this
 * document, whose `id` names that row. Nothing here bakes a presigned URL into
 * a row: `url` is populated only for a public bucket, where it is a stable CDN
 * address rather than a credential with an expiry.
 */

import type { FileProjection, S3Config } from './types';

/**
 * `id` is the files row — the load-bearing field: it is what makes the column a
 * projection rather than a second, unmanaged copy of the truth, and it is what
 * storage GC counts before collecting an object.
 *
 * `url` is set only for public buckets. Prefer `id` plus the files row's
 * `downloadUrl`, which is late-bound and works for private buckets too.
 */
export type { FileProjection } from './types';

/**
 * Build the projection document for a files row.
 *
 * A public bucket has a stable address, so `url` is a real, durable value there.
 * A private bucket has no such address — only presigned, expiring ones — so the
 * field is omitted rather than filled with a URL that dies in an hour.
 */
export function buildFileProjection(
  file: { id: string; key: string; bucketId: string; mime: string; size: number; filename?: string | null },
  bucket: { is_public: boolean },
  s3: S3Config,
): FileProjection {
  const projection: FileProjection = {
    id: file.id,
    key: file.key,
    bucket_id: file.bucketId,
    mime: file.mime,
    size: file.size,
  };
  if (file.filename) projection.filename = file.filename;

  if (bucket.is_public && s3.publicUrlPrefix) {
    projection.url = `${s3.publicUrlPrefix.replace(/\/$/, '')}/${file.key}`;
  }

  return projection;
}
