# requestBulkUploadUrls

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request presigned URLs for uploading multiple files in a single batch.
Subject to per-storage-module limits (max_bulk_files, max_bulk_total_size).
Each file is processed independently — some may dedup while others get fresh URLs.

## Usage

```bash
csdk request-bulk-upload-urls --input.bucketKey <String> --input.ownerId <UUID> --input.files <BulkUploadFileInput>
```

## Examples

### Run requestBulkUploadUrls

```bash
csdk request-bulk-upload-urls --input.bucketKey <String> --input.ownerId <UUID> --input.files <BulkUploadFileInput>
```
