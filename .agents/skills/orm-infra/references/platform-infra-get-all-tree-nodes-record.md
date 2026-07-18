# platformInfraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformInfraGetAllTreeNodesRecord records

## Usage

```typescript
db.platformInfraGetAllTreeNodesRecord.findMany({ select: { id: true } }).execute()
db.platformInfraGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInfraGetAllTreeNodesRecord.create({ data: { data: '<JSON>', path: '<String>' }, select: { id: true } }).execute()
db.platformInfraGetAllTreeNodesRecord.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.platformInfraGetAllTreeNodesRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInfraGetAllTreeNodesRecord records

```typescript
const items = await db.platformInfraGetAllTreeNodesRecord.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a platformInfraGetAllTreeNodesRecord

```typescript
const item = await db.platformInfraGetAllTreeNodesRecord.create({
  data: { data: '<JSON>', path: '<String>' },
  select: { id: true }
}).execute();
```
