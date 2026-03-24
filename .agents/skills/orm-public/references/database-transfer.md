# databaseTransfer

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DatabaseTransfer records

## Usage

```typescript
db.databaseTransfer.findMany({ select: { id: true } }).execute()
db.databaseTransfer.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseTransfer.create({ data: { databaseId: '<UUID>', targetOwnerId: '<UUID>', sourceApproved: '<Boolean>', targetApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', targetApprovedAt: '<Datetime>', status: '<String>', initiatedBy: '<UUID>', notes: '<String>', expiresAt: '<Datetime>', completedAt: '<Datetime>' }, select: { id: true } }).execute()
db.databaseTransfer.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.databaseTransfer.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseTransfer records

```typescript
const items = await db.databaseTransfer.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a databaseTransfer

```typescript
const item = await db.databaseTransfer.create({
  data: { databaseId: '<UUID>', targetOwnerId: '<UUID>', sourceApproved: '<Boolean>', targetApproved: '<Boolean>', sourceApprovedAt: '<Datetime>', targetApprovedAt: '<Datetime>', status: '<String>', initiatedBy: '<UUID>', notes: '<String>', expiresAt: '<Datetime>', completedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
