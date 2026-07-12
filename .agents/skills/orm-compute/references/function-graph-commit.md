# functionGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
db.functionGraphCommit.findMany({ select: { id: true } }).execute()
db.functionGraphCommit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionGraphCommit.create({ data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' }, select: { id: true } }).execute()
db.functionGraphCommit.update({ where: { id: '<UUID>' }, data: { message: '<String>' }, select: { id: true } }).execute()
db.functionGraphCommit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionGraphCommit records

```typescript
const items = await db.functionGraphCommit.findMany({
  select: { id: true, message: true }
}).execute();
```

### Create a functionGraphCommit

```typescript
const item = await db.functionGraphCommit.create({
  data: { message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' },
  select: { id: true }
}).execute();
```
