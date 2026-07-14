# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DatabaseTransfer records

## Usage

```typescript
db.databaseTransfer.findMany({ select: { id: true } }).execute()
db.databaseTransfer.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseTransfer.create({ data: { completedAt: '<Datetime>', databaseId: '<UUID>', expiresAt: '<Datetime>', initiatedBy: '<UUID>', notes: '<String>', sourceApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', status: '<String>', targetApproved: '<Boolean>', targetApprovedAt: '<Datetime>', targetOwnerId: '<UUID>' }, select: { id: true } }).execute()
db.databaseTransfer.update({ where: { id: '<UUID>' }, data: { completedAt: '<Datetime>' }, select: { id: true } }).execute()
db.databaseTransfer.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseTransfer records

```typescript
const items = await db.databaseTransfer.findMany({
  select: { id: true, completedAt: true }
}).execute();
```

### Create a databaseTransfer

```typescript
const item = await db.databaseTransfer.create({
  data: { completedAt: '<Datetime>', databaseId: '<UUID>', expiresAt: '<Datetime>', initiatedBy: '<UUID>', notes: '<String>', sourceApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', status: '<String>', targetApproved: '<Boolean>', targetApprovedAt: '<Datetime>', targetOwnerId: '<UUID>' },
  select: { id: true }
}).execute();
```
