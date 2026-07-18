# infraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InfraGetAllTreeNodesRecord records

## Usage

```typescript
db.infraGetAllTreeNodesRecord.findMany({ select: { id: true } }).execute()
db.infraGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraGetAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute()
db.infraGetAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.infraGetAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraGetAllTreeNodesRecord records

```typescript
const items = await db.infraGetAllTreeNodesRecord.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a infraGetAllTreeNodesRecord

```typescript
const item = await db.infraGetAllTreeNodesRecord.create({
  data: { data: '<JSON>', path: '<String>' },
  select: { id: true }
}).execute();
```
