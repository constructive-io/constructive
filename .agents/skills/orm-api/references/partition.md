# partition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Partition records

## Usage

```typescript
db.partition.findMany({ select: { id: true } }).execute()
db.partition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.partition.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>', isParented: '<Boolean>' }, select: { id: true } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', strategy: '<String>', partitionKeyId: '<UUID>', interval: '<String>', retention: '<String>', retentionKeepTable: '<Boolean>', premake: '<Int>', namingPattern: '<String>', isParented: '<Boolean>' },
  select: { id: true }
}).execute();
```
