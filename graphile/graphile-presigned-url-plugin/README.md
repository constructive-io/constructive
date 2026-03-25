# graphile-presigned-url-plugin

Presigned URL upload plugin for PostGraphile v5.

## Features

- `requestUploadUrl` mutation — generates presigned PUT URLs for direct client-to-S3 upload
- `confirmUpload` mutation — verifies upload and transitions file status to 'ready'
- `downloadUrl` computed field — presigned GET URLs for private files, public URLs for public files
- Content-hash based S3 keys (SHA-256) with automatic deduplication
- Per-bucket MIME type and file size validation
- Upload request tracking for audit and rate limiting

## Usage

```typescript
import { PresignedUrlPreset } from 'graphile-presigned-url-plugin';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

const preset = {
  extends: [
    PresignedUrlPreset({
      s3: {
        client: s3Client,
        bucket: 'my-uploads',
        publicUrlPrefix: 'https://cdn.example.com',
      },
      urlExpirySeconds: 900,
      maxFileSize: 200 * 1024 * 1024,
    }),
  ],
};
```
