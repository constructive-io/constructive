# databaseGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
db.databaseGraphRef.findMany({ select: { id: true } }).execute()
db.databaseGraphRef.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseGraphRef.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.databaseGraphRef.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.databaseGraphRef.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseGraphRef records

```typescript
const items = await db.databaseGraphRef.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a databaseGraphRef

```typescript
const item = await db.databaseGraphRef.create({
  data: { commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
