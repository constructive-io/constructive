# partition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Partition records

## Usage

```typescript
db.partition.findMany({ select: { id: true } }).execute()
db.partition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.partition.create({ data: { databaseId: '<UUID>', interval: '<String>', isParented: '<Boolean>', namingPattern: '<String>', partitionKeyId: '<UUID>', premake: '<Int>', retention: '<String>', retentionKeepTable: '<Boolean>', strategy: '<String>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.partition.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.partition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all partition records

```typescript
const items = await db.partition.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a partition

```typescript
const item = await db.partition.create({
  data: { databaseId: '<UUID>', interval: '<String>', isParented: '<Boolean>', namingPattern: '<String>', partitionKeyId: '<UUID>', premake: '<Int>', retention: '<String>', retentionKeepTable: '<Boolean>', strategy: '<String>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
