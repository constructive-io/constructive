/**
 * GraphQL query builders for the per-table presigned URL upload pipeline.
 *
 * These are plain strings — no graphql-tag dependency needed.
 * They match the per-table schema defined in graphile-presigned-url-plugin:
 * upload fields are on bucket types (via @storageBuckets smart tag),
 * not global mutations.
 */

/**
 * Build the GraphQL query for requesting an upload URL from a specific bucket type.
 *
 * The query fetches a bucket by key from the per-table PostGraphile type,
 * then calls the requestUploadUrl field on that bucket instance.
 *
 * @param bucketQueryField - The PostGraphile query field name for the bucket type
 *   (e.g., "bucketByKey", "appBucketByKey", "dataRoomBucketByKeyAndOwnerId")
 */
export function buildRequestUploadUrlQuery(bucketQueryField: string): string {
  return `
  query RequestUploadUrl($key: String!, $contentHash: String!, $contentType: String!, $size: Int!, $filename: String) {
    ${bucketQueryField}(key: $key) {
      id
      requestUploadUrl(
        contentHash: $contentHash
        contentType: $contentType
        size: $size
        filename: $filename
      ) {
        uploadUrl
        uploadHeaders
        fileId
        key
        deduplicated
        expiresAt
      }
    }
  }
`;
}

/** Default query field for app-level buckets */
export const DEFAULT_BUCKET_QUERY_FIELD = 'bucketByKey';

/** Pre-built query for the default bucket type */
export const REQUEST_UPLOAD_URL_QUERY = buildRequestUploadUrlQuery(DEFAULT_BUCKET_QUERY_FIELD);

/**
 * @deprecated Use REQUEST_UPLOAD_URL_QUERY instead.
 * Kept for backward compatibility during migration.
 */
export const REQUEST_UPLOAD_URL_MUTATION = REQUEST_UPLOAD_URL_QUERY;
