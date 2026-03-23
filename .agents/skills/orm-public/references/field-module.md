# fieldModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FieldModule records

## Usage

```typescript
db.fieldModule.findMany({ select: { id: true } }).execute()
db.fieldModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.fieldModule.create({ data: { databaseId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', nodeType: '<String>', data: '<JSON>', triggers: '<String>', functions: '<String>' }, select: { id: true } }).execute()
db.fieldModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.fieldModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all fieldModule records

```typescript
const items = await db.fieldModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a fieldModule

```typescript
const item = await db.fieldModule.create({
  data: { databaseId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', fieldId: '<UUID>', nodeType: '<String>', data: '<JSON>', triggers: '<String>', functions: '<String>' },
  select: { id: true }
}).execute();
```
