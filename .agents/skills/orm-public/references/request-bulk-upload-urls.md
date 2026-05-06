# requestBulkUploadUrls

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request presigned URLs for uploading multiple files in a single batch.
Subject to per-storage-module limits (max_bulk_files, max_bulk_total_size).
Each file is processed independently — some may dedup while others get fresh URLs.

## Usage

```typescript
db.mutation.requestBulkUploadUrls({ input: { bucketKey: '<String>', ownerId: '<UUID>', files: '<BulkUploadFileInput>' } }).execute()
```

## Examples

### Run requestBulkUploadUrls

```typescript
const result = await db.mutation.requestBulkUploadUrls({ input: { bucketKey: '<String>', ownerId: '<UUID>', files: '<BulkUploadFileInput>' } }).execute();
```
