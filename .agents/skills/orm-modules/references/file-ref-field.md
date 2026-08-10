# fileRefField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FileRefField records

## Usage

```typescript
db.fileRefField.findMany({ select: { id: true } }).execute()
db.fileRefField.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.fileRefField.create({ data: { bucketKey: '<String>', bucketTags: '<String>', databaseId: '<UUID>', enforceFk: '<Boolean>', fieldId: '<UUID>', isPublic: '<Boolean>', storageModuleId: '<UUID>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.fileRefField.update({ where: { id: '<UUID>' }, data: { bucketKey: '<String>' }, select: { id: true } }).execute()
db.fileRefField.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all fileRefField records

```typescript
const items = await db.fileRefField.findMany({
  select: { id: true, bucketKey: true }
}).execute();
```

### Create a fileRefField

```typescript
const item = await db.fileRefField.create({
  data: { bucketKey: '<String>', bucketTags: '<String>', databaseId: '<UUID>', enforceFk: '<Boolean>', fieldId: '<UUID>', isPublic: '<Boolean>', storageModuleId: '<UUID>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
