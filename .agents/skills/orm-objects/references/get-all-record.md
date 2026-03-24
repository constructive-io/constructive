# getAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for GetAllRecord records

## Usage

```typescript
db.getAllRecord.findMany({ select: { id: true } }).execute()
db.getAllRecord.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.getAllRecord.create({ data: { path: '<String>', data: '<JSON>' }, select: { id: true } }).execute()
db.getAllRecord.update({ where: { id: '<UUID>' }, data: { path: '<String>' }, select: { id: true } }).execute()
db.getAllRecord.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all getAllRecord records

```typescript
const items = await db.getAllRecord.findMany({
  select: { id: true, path: true }
}).execute();
```

### Create a getAllRecord

```typescript
const item = await db.getAllRecord.create({
  data: { path: '<String>', data: '<JSON>' },
  select: { id: true }
}).execute();
```
