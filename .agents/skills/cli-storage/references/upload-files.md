# uploadFiles

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Upload multiple files: resolves the bucket by key, creates file rows, and returns presigned PUT URLs for each.

## Usage

```bash
csdk upload-files --input.bucketKey <String> --input.files <UploadFileBulkFileInput> --input.isPublic <Boolean>
```

## Examples

### Run uploadFiles

```bash
csdk upload-files --input.bucketKey <String> --input.files <UploadFileBulkFileInput> --input.isPublic <Boolean>
```
