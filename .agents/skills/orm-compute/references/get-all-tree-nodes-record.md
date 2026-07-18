# getAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GetAllTreeNodesRecord records

## Usage

```typescript
db.getAllTreeNodesRecord.findMany({ select: { id: true } }).execute()
db.getAllTreeNodesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.getAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute()
db.getAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.getAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all getAllTreeNodesRecord records

```typescript
const items = await db.getAllTreeNodesRecord.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a getAllTreeNodesRecord

```typescript
const item = await db.getAllTreeNodesRecord.create({
  data: { data: '<JSON>', path: '<String>' },
  select: { id: true }
}).execute();
```
