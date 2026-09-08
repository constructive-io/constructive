# platformResourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourceObservedStorage data operations

## Usage

```typescript
usePlatformResourceObservedStoragesQuery({ selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } } })
useCreatePlatformResourceObservedStorageMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourceObservedStorages

```typescript
const { data, isLoading } = usePlatformResourceObservedStoragesQuery({
  selection: { fields: { capacity: true, capacityBytes: true, claimName: true, declaredStorageClass: true, declaredStorageSizeBytes: true, declaredStorageTotalBytes: true, installationId: true, isBound: true, kind: true, namespaceId: true, phase: true, requested: true, requestedBytes: true, resourceId: true, resourceStatus: true, slug: true, storageClass: true, storageName: true } },
});
```

### Create a platformResourceObservedStorage

```typescript
const { mutate } = useCreatePlatformResourceObservedStorageMutation({
  selection: { fields: { id: true } },
});
mutate({ capacity: '<String>', capacityBytes: '<BigInt>', claimName: '<String>', declaredStorageClass: '<String>', declaredStorageSizeBytes: '<BigInt>', declaredStorageTotalBytes: '<BigInt>', installationId: '<UUID>', isBound: '<Boolean>', kind: '<String>', namespaceId: '<UUID>', phase: '<String>', requested: '<String>', requestedBytes: '<BigInt>', resourceId: '<UUID>', resourceStatus: '<String>', slug: '<String>', storageClass: '<String>', storageName: '<String>' });
```
