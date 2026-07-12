# infraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
db.infraCommit.findMany({ select: { id: true } }).execute()
db.infraCommit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraCommit.create({ data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute()
db.infraCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute()
db.infraCommit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraCommit records

```typescript
const items = await db.infraCommit.findMany({
  select: { id: true, message: true }
}).execute();
```

### Create a infraCommit

```typescript
const item = await db.infraCommit.create({
  data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' },
  select: { id: true }
}).execute();
```
