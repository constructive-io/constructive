# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DenormalizedTableField records

## Usage

```typescript
db.denormalizedTableField.findMany({ select: { id: true } }).execute()
db.denormalizedTableField.findOne({ id: '<value>', select: { id: true } }).execute()
db.denormalizedTableField.create({ data: { databaseId: '<value>', tableId: '<value>', fieldId: '<value>', setIds: '<value>', refTableId: '<value>', refFieldId: '<value>', refIds: '<value>', useUpdates: '<value>', updateDefaults: '<value>', funcName: '<value>', funcOrder: '<value>' }, select: { id: true } }).execute()
db.denormalizedTableField.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.denormalizedTableField.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all denormalizedTableField records

```typescript
const items = await db.denormalizedTableField.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a denormalizedTableField

```typescript
const item = await db.denormalizedTableField.create({
  data: { databaseId: 'value', tableId: 'value', fieldId: 'value', setIds: 'value', refTableId: 'value', refFieldId: 'value', refIds: 'value', useUpdates: 'value', updateDefaults: 'value', funcName: 'value', funcOrder: 'value' },
  select: { id: true }
}).execute();
```
