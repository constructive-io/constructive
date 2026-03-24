# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A commit records changes to the repository.

## Usage

```typescript
db.commit.findMany({ select: { id: true } }).execute()
db.commit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.commit.create({ data: { message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute()
db.commit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute()
db.commit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all commit records

```typescript
const items = await db.commit.findMany({
  select: { id: true, message: true }
}).execute();
```

### Create a commit

```typescript
const item = await db.commit.create({
  data: { message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' },
  select: { id: true }
}).execute();
```
