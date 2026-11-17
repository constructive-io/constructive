# resourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourceObservedStorage data operations

## Usage

```typescript
useResourceObservedStoragesQuery({ selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } } })
```

## Examples

### List all resourceObservedStorages

```typescript
const { data, isLoading } = useResourceObservedStoragesQuery({
  selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } },
});
```
