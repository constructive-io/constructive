# orm-tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableTemplateModule records

## Usage

```typescript
db.tableTemplateModule.findMany({ select: { id: true } }).execute()
db.tableTemplateModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.tableTemplateModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>', nodeType: '<value>', data: '<value>' }, select: { id: true } }).execute()
db.tableTemplateModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.tableTemplateModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', ownerTableId: 'value', tableName: 'value', nodeType: 'value', data: 'value' },
  select: { id: true }
}).execute();
```
