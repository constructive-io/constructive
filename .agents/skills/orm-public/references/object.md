# object

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Object records

## Usage

```typescript
db.object.findMany({ select: { id: true } }).execute()
db.object.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.object.create({ data: { hashUuid: '<UUID>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' }, select: { id: true } }).execute()
db.object.update({ where: { id: '<UUID>' }, data: { hashUuid: '<UUID>' }, select: { id: true } }).execute()
db.object.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all object records

```typescript
const items = await db.object.findMany({
  select: { id: true, hashUuid: true }
}).execute();
```

### Create a object

```typescript
const item = await db.object.create({
  data: { hashUuid: '<UUID>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>', frzn: '<Boolean>' },
  select: { id: true }
}).execute();
```
