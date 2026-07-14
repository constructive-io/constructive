# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
db.commit.findMany({ select: { id: true } }).execute()
db.commit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.commit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute()
db.commit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute()
db.commit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all commit records

```typescript
const items = await db.commit.findMany({
  select: { id: true, authorId: true }
}).execute();
```

### Create a commit

```typescript
const item = await db.commit.create({
  data: { authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' },
  select: { id: true }
}).execute();
```
