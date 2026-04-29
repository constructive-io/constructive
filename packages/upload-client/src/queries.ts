/**
 * GraphQL mutation strings for the presigned URL upload pipeline.
 *
 * These are plain strings — no graphql-tag dependency needed.
 * They match the schema defined in graphile-presigned-url-plugin.
 */

export const REQUEST_UPLOAD_URL_MUTATION = `
  mutation RequestUploadUrl($input: RequestUploadUrlInput!) {
    requestUploadUrl(input: $input) {
      uploadUrl
      fileId
      key
      deduplicated
      expiresAt
      status
    }
  }
`;

export const CONFIRM_UPLOAD_MUTATION = `
  mutation ConfirmUpload($input: ConfirmUploadInput!) {
    confirmUpload(input: $input) {
      fileId
      status
      success
    }
  }
`;
