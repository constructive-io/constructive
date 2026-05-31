# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Function records

## Usage

```typescript
db.function.findMany({ select: { id: true } }).execute()
db.function.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.function.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>' }, select: { id: true } }).execute()
db.function.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.function.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all function records

```typescript
const items = await db.function.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a function

```typescript
const item = await db.function.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>' },
  select: { id: true }
}).execute();
```
