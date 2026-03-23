# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A store represents an isolated object repository within a database.

## Usage

```typescript
db.store.findMany({ select: { id: true } }).execute()
db.store.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.store.create({ data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' }, select: { id: true } }).execute()
db.store.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.store.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all store records

```typescript
const items = await db.store.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a store

```typescript
const item = await db.store.create({
  data: { name: '<String>', databaseId: '<UUID>', hash: '<UUID>' },
  select: { id: true }
}).execute();
```
