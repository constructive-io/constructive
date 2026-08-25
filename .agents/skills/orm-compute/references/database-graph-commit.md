# databaseGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
db.databaseGraphCommit.findMany({ select: { id: true } }).execute()
db.databaseGraphCommit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseGraphCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute()
db.databaseGraphCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute()
db.databaseGraphCommit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseGraphCommit records

```typescript
const items = await db.databaseGraphCommit.findMany({
  select: { id: true, authorId: true }
}).execute();
```

### Create a databaseGraphCommit

```typescript
const item = await db.databaseGraphCommit.create({
  data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' },
  select: { id: true }
}).execute();
```
