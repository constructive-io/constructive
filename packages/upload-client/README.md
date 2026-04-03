# @constructive-io/upload-client

Client-side presigned URL upload utilities for Constructive.

## Usage

```typescript
import { uploadFile, hashFile } from '@constructive-io/upload-client';

// Full orchestrated upload
const result = await uploadFile({
  file: selectedFile,
  bucketKey: 'avatars',
  execute: myGraphQLExecutor,
  onProgress: (pct) => console.log(`${pct}%`),
});

// Or use atomic functions individually
const hash = await hashFile(myFile);
```

## API

### `uploadFile(options)`

Orchestrates the full presigned URL upload flow: hash → requestUploadUrl → PUT → confirmUpload.

### `hashFile(file)`

Computes SHA-256 hash using the Web Crypto API.

### `hashFileChunked(file, chunkSize?, onProgress?)`

Computes SHA-256 hash in chunks for large files.
