# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableGrant records

## Usage

```typescript
db.tableGrant.findMany({ select: { id: true } }).execute()
db.tableGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.tableGrant.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', privilege: '<String>', granteeName: '<String>', fieldIds: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.tableGrant.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.tableGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all tableGrant records

```typescript
const items = await db.tableGrant.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a tableGrant

```typescript
const item = await db.tableGrant.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', privilege: '<String>', granteeName: '<String>', fieldIds: '<UUID>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
