# tableModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableModule records

## Usage

```typescript
db.tableModule.findMany({ select: { id: true } }).execute()
db.tableModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.tableModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', nodeType: '<value>', useRls: '<value>', data: '<value>', fields: '<value>' }, select: { id: true } }).execute()
db.tableModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.tableModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all tableModule records

```typescript
const items = await db.tableModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a tableModule

```typescript
const item = await db.tableModule.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value', nodeType: 'value', useRls: 'value', data: 'value', fields: 'value' },
  select: { id: true }
}).execute();
```
