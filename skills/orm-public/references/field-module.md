# fieldModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FieldModule records

## Usage

```typescript
db.fieldModule.findMany({ select: { id: true } }).execute()
db.fieldModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.fieldModule.create({ data: { databaseId: '<value>', privateSchemaId: '<value>', tableId: '<value>', fieldId: '<value>', nodeType: '<value>', data: '<value>', triggers: '<value>', functions: '<value>' }, select: { id: true } }).execute()
db.fieldModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.fieldModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', privateSchemaId: 'value', tableId: 'value', fieldId: 'value', nodeType: 'value', data: 'value', triggers: 'value', functions: 'value' },
  select: { id: true }
}).execute();
```
