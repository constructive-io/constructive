# ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A ref is a data structure for pointing to a commit.

## Usage

```typescript
db.ref.findMany({ select: { id: true } }).execute()
db.ref.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.ref.create({ data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' }, select: { id: true } }).execute()
db.ref.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.ref.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all ref records

```typescript
const items = await db.ref.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a ref

```typescript
const item = await db.ref.create({
  data: { name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' },
  select: { id: true }
}).execute();
```
