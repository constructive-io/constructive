# databaseGraphGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DatabaseGraphGetAllTreeNodesRecord records

## Usage

```typescript
db.databaseGraphGetAllTreeNodesRecord.findMany({ select: { id: true } }).execute()
db.databaseGraphGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.databaseGraphGetAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute()
db.databaseGraphGetAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.databaseGraphGetAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all databaseGraphGetAllTreeNodesRecord records

```typescript
const items = await db.databaseGraphGetAllTreeNodesRecord.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a databaseGraphGetAllTreeNodesRecord

```typescript
const item = await db.databaseGraphGetAllTreeNodesRecord.create({
  data: { data: '<JSON>', path: '<String>' },
  select: { id: true }
}).execute();
```
