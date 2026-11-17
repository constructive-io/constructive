# platformInfraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformInfraGetAllTreeNodesRecord records

## Usage

```typescript
db.platformInfraGetAllTreeNodesRecord.findMany({ select: { id: true } }).execute()
db.platformInfraGetAllTreeNodesRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
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
