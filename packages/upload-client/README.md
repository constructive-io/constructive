# @constructive-io/upload-client

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/upload-client"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fupload-client%2Fpackage.json"/></a>
</p>

Client-side presigned URL upload utilities for Constructive.

No Node.js-only dependencies — all APIs use Web standards (fetch, Web Crypto).

## Usage

```typescript
import { createStorageClient } from '@constructive-io/graphql-query';
import { storageTransport, hashFile, hashContent, putToPresignedUrl, fetchFromUrl } from '@constructive-io/upload-client';

// Full orchestrated upload
const storage = createStorageClient({
  execute: myGraphQLExecutor,
  transport: storageTransport,
});
const result = await storage.upload(
  { filesType: 'AppFile' },
  { file: selectedFile, bucketKey: 'avatars' },
);

// Atomic functions for custom flows
const hash = await hashFile(myFile);
const contentHash = await hashContent('file contents');
await putToPresignedUrl(presignedUrl, content, 'image/png');
const response = await fetchFromUrl(downloadUrl);
```

## API

### Upload orchestration

Use `createStorageClient` from `@constructive-io/graphql-query` with
`storageTransport` from this package for the full upload flow: hash → per-files-table
`upload<FilesType>` mutation → PUT to S3. The client discovers the upload surface
from the server's `_meta`; select a storage plane by its files type or table.
Replace `AppFile` in the example with your plane's GraphQL files type.

This package provides the byte-level hashing, presigned PUT/GET helpers, and
`storageTransport` adapter, not a GraphQL upload orchestrator.

### `hashFile(file)`

Computes SHA-256 hash of a File/Blob using the Web Crypto API.

### `hashFileChunked(file, chunkSize?, onProgress?)`

Computes SHA-256 hash in chunks for large files.

### `hashContent(content)`

Computes SHA-256 hex digest of a plain string using the Web Crypto API.

### `putToPresignedUrl(url, body, contentType, signal?)`

PUT content to a presigned S3 URL. Throws `UploadError` on failure.

### `fetchFromUrl(url, signal?)`

Fetch content from a presigned GET or CDN URL. Throws `UploadError` on failure.
