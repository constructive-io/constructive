# file

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Individual file records within buckets, with immutable identity fields and mutable metadata

## Usage

```typescript
useFilesQuery({ selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, databaseId: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, rejectionReason: true, size: true, status: true, tags: true, updatedAt: true, upload: true } } })
useFileQuery({ id: '<UUID>', selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, databaseId: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, rejectionReason: true, size: true, status: true, tags: true, updatedAt: true, upload: true } } })
useUpdateFileMutation({ selection: { fields: { id: true } } })
useDeleteFileMutation({})
```

## Examples

### List all files

```typescript
const { data, isLoading } = useFilesQuery({
  selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, databaseId: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, rejectionReason: true, size: true, status: true, tags: true, updatedAt: true, upload: true } },
});
```
