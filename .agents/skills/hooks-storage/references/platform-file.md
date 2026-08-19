# platformFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Individual file records within buckets, with immutable identity fields and mutable metadata

## Usage

```typescript
usePlatformFilesQuery({ selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, size: true, status: true, tags: true, updatedAt: true, upload: true } } })
usePlatformFileQuery({ id: '<UUID>', selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, size: true, status: true, tags: true, updatedAt: true, upload: true } } })
useCreatePlatformFileMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFileMutation({ selection: { fields: { id: true } } })
useDeletePlatformFileMutation({})
```

## Examples

### List all platformFiles

```typescript
const { data, isLoading } = usePlatformFilesQuery({
  selection: { fields: { actorId: true, bucketId: true, contentHash: true, createdAt: true, description: true, downloadUrl: true, expiryEnqueuedAt: true, filePath: true, filename: true, id: true, isPublic: true, key: true, mimeType: true, promotedAt: true, size: true, status: true, tags: true, updatedAt: true, upload: true } },
});
```

### Create a platformFile

```typescript
const { mutate } = useCreatePlatformFileMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', bucketId: '<UUID>', contentHash: '<String>', description: '<String>', downloadUrl: '<String>', expiryEnqueuedAt: '<Datetime>', filePath: '<String>', filename: '<String>', isPublic: '<Boolean>', key: '<String>', mimeType: '<String>', promotedAt: '<Datetime>', size: '<BigInt>', status: '<FileStatus>', tags: '<String>', upload: '<Upload>' });
```
