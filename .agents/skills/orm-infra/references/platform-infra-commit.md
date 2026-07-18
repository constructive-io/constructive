# platformInfraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Commit history — each commit snapshots a tree root for a store

## Usage

```typescript
db.platformInfraCommit.findMany({ select: { id: true } }).execute()
db.platformInfraCommit.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInfraCommit.create({ data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraCommit.update({ where: { id: '<UUID>' }, data: { authorId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraCommit.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInfraCommit records

```typescript
const items = await db.platformInfraCommit.findMany({
  select: { id: true, authorId: true }
}).execute();
```

### Create a platformInfraCommit

```typescript
const item = await db.platformInfraCommit.create({
  data: { authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' },
  select: { id: true }
}).execute();
```
