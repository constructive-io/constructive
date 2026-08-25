# resourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceObservedStorage records

## Usage

```typescript
db.resourceObservedStorage.findMany({ select: { id: true } }).execute()
db.resourceObservedStorage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceObservedStorage.create({ data: { capacity: '<String>', capacityBytes: '<BigInt>', claimName: '<String>', declaredStorageClass: '<String>', declaredStorageSizeBytes: '<BigInt>', declaredStorageTotalBytes: '<BigInt>', installationId: '<UUID>', isBound: '<Boolean>', kind: '<String>', namespaceId: '<UUID>', phase: '<String>', requested: '<String>', requestedBytes: '<BigInt>', resourceId: '<UUID>', resourceStatus: '<String>', slug: '<String>', storageClass: '<String>', storageName: '<String>' }, select: { id: true } }).execute()
db.resourceObservedStorage.update({ where: { id: '<UUID>' }, data: { capacity: '<String>' }, select: { id: true } }).execute()
db.resourceObservedStorage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceObservedStorage records

```typescript
const items = await db.resourceObservedStorage.findMany({
  select: { id: true, capacity: true }
}).execute();
```

### Create a resourceObservedStorage

```typescript
const item = await db.resourceObservedStorage.create({
  data: { capacity: '<String>', capacityBytes: '<BigInt>', claimName: '<String>', declaredStorageClass: '<String>', declaredStorageSizeBytes: '<BigInt>', declaredStorageTotalBytes: '<BigInt>', installationId: '<UUID>', isBound: '<Boolean>', kind: '<String>', namespaceId: '<UUID>', phase: '<String>', requested: '<String>', requestedBytes: '<BigInt>', resourceId: '<UUID>', resourceStatus: '<String>', slug: '<String>', storageClass: '<String>', storageName: '<String>' },
  select: { id: true }
}).execute();
```
