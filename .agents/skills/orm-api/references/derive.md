# derive

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Derive records

## Usage

```typescript
db.derive.findMany({ select: { id: true } }).execute()
db.derive.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.derive.create({ data: { databaseId: '<UUID>', includeMutations: '<Boolean>', kind: '<String>', policyPrefix: '<String>', sourceTableId: '<UUID>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.derive.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.derive.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all derive records

```typescript
const items = await db.derive.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a derive

```typescript
const item = await db.derive.create({
  data: { databaseId: '<UUID>', includeMutations: '<Boolean>', kind: '<String>', policyPrefix: '<String>', sourceTableId: '<UUID>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
