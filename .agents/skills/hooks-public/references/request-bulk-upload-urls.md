# requestBulkUploadUrls

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request presigned URLs for uploading multiple files in a single batch.
Subject to per-storage-module limits (max_bulk_files, max_bulk_total_size).
Each file is processed independently — some may dedup while others get fresh URLs.

## Usage

```typescript
const { mutate } = useRequestBulkUploadUrlsMutation(); mutate({ input: { bucketKey: '<String>', ownerId: '<UUID>', files: '<BulkUploadFileInput>' } });
```

## Examples

### Use useRequestBulkUploadUrlsMutation

```typescript
const { mutate, isLoading } = useRequestBulkUploadUrlsMutation();
mutate({ input: { bucketKey: '<String>', ownerId: '<UUID>', files: '<BulkUploadFileInput>' } });
```
