# tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableTemplateModule records

## Usage

```typescript
db.tableTemplateModule.findMany({ select: { id: true } }).execute()
db.tableTemplateModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.tableTemplateModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', nodeType: '<String>', data: '<JSON>' }, select: { id: true } }).execute()
db.tableTemplateModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.tableTemplateModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all tableTemplateModule records

```typescript
const items = await db.tableTemplateModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a tableTemplateModule

```typescript
const item = await db.tableTemplateModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>', nodeType: '<String>', data: '<JSON>' },
  select: { id: true }
}).execute();
```
