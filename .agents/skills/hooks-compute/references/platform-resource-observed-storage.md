# platformResourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourceObservedStorage data operations

## Usage

```typescript
usePlatformResourceObservedStoragesQuery({ selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } } })
```

## Examples

### List all platformResourceObservedStorages

```typescript
const { data, isLoading } = usePlatformResourceObservedStoragesQuery({
  selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } },
});
```
