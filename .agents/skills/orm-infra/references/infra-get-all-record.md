# infraGetAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InfraGetAllRecord records

## Usage

```typescript
db.infraGetAllRecord.findMany({ select: { id: true } }).execute()
db.infraGetAllRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.infraGetAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute()
db.infraGetAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute()
db.infraGetAllRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all infraGetAllRecord records

```typescript
const items = await db.infraGetAllRecord.findMany({
  select: { id: true, path: true }
}).execute();
```

### Create a infraGetAllRecord

```typescript
const item = await db.infraGetAllRecord.create({
  data: { path: '<String>', data: '<JSON>' },
  select: { id: true }
}).execute();
```
