# platformResourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceObservedStorage records

## Usage

```typescript
db.platformResourceObservedStorage.findMany({ select: { id: true } }).execute()
db.platformResourceObservedStorage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceObservedStorage.create({ data: { capacity: '<String>', capacityBytes: '<BigInt>', claimName: '<String>', declaredStorageClass: '<String>', declaredStorageSizeBytes: '<BigInt>', declaredStorageTotalBytes: '<BigInt>', installationId: '<UUID>', isBound: '<Boolean>', kind: '<String>', namespaceId: '<UUID>', phase: '<String>', requested: '<String>', requestedBytes: '<BigInt>', resourceId: '<UUID>', resourceStatus: '<String>', slug: '<String>', storageClass: '<String>', storageName: '<String>' }, select: { id: true } }).execute()
db.platformResourceObservedStorage.update({ where: { id: '<UUID>' }, data: { capacity: '<String>' }, select: { id: true } }).execute()
db.platformResourceObservedStorage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceObservedStorage records

```typescript
const items = await db.platformResourceObservedStorage.findMany({
  select: { id: true, capacity: true }
}).execute();
```

### Create a platformResourceObservedStorage

```typescript
const item = await db.platformResourceObservedStorage.create({
  data: { capacity: '<String>', capacityBytes: '<BigInt>', claimName: '<String>', declaredStorageClass: '<String>', declaredStorageSizeBytes: '<BigInt>', declaredStorageTotalBytes: '<BigInt>', installationId: '<UUID>', isBound: '<Boolean>', kind: '<String>', namespaceId: '<UUID>', phase: '<String>', requested: '<String>', requestedBytes: '<BigInt>', resourceId: '<UUID>', resourceStatus: '<String>', slug: '<String>', storageClass: '<String>', storageName: '<String>' },
  select: { id: true }
}).execute();
```
