# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
db.store.findMany({ select: { id: true } }).execute()
db.store.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.store.create({ data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' }, select: { id: true } }).execute()
db.store.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.store.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all store records

```typescript
const items = await db.store.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a store

```typescript
const item = await db.store.create({
  data: { databaseId: '<UUID>', hash: '<UUID>', name: '<String>' },
  select: { id: true }
}).execute();
```
