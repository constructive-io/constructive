# requestUploadUrl

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Request a presigned URL for uploading a file directly to S3.
Client computes SHA-256 of the file content and provides it here.
If a file with the same hash already exists (dedup), returns the
existing file ID and deduplicated=true with no uploadUrl.

## Usage

```bash
csdk request-upload-url --input.bucketKey <String> --input.contentHash <String> --input.contentType <String> --input.size <Int> --input.filename <String>
```

## Examples

### Run requestUploadUrl

```bash
csdk request-upload-url --input.bucketKey <String> --input.contentHash <String> --input.contentType <String> --input.size <Int> --input.filename <String>
```
