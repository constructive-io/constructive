# infraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
db.infraStore.findMany({ select: { id: true } }).execute()
db.infraStore.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraStore.create({ data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' }, select: { id: true } }).execute()
db.infraStore.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.infraStore.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraStore records

```typescript
const items = await db.infraStore.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a infraStore

```typescript
const item = await db.infraStore.create({
  data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' },
  select: { id: true }
}).execute();
```
