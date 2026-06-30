# functionGraphStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named stores — one per version-controlled tree (e.g. one graph, one definition set)

## Usage

```typescript
db.functionGraphStore.findMany({ select: { id: true } }).execute()
db.functionGraphStore.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphStore.create({ data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute()
db.functionGraphStore.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.functionGraphStore.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphStore records

```typescript
const items = await db.functionGraphStore.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a functionGraphStore

```typescript
const item = await db.functionGraphStore.create({
  data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' },
  select: { id: true }
}).execute();
```
