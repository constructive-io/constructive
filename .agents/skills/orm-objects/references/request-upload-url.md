# requestUploadUrl

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl.

## Usage

```typescript
db.mutation.requestUploadUrl({ input: { bucketKey: '<String>', contentHash: '<String>', contentType: '<String>', size: '<Int>', filename: '<String>' } }).execute()
```

## Examples

### Run requestUploadUrl

```typescript
const result = await db.mutation.requestUploadUrl({ input: { bucketKey: '<String>', contentHash: '<String>', contentType: '<String>', size: '<Int>', filename: '<String>' } }).execute();
```
