# orm-foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ForeignKeyConstraint records

## Usage

```typescript
db.foreignKeyConstraint.findMany({ select: { id: true } }).execute()
db.foreignKeyConstraint.findOne({ id: '<value>', select: { id: true } }).execute()
db.foreignKeyConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', description: '<value>', smartTags: '<value>', type: '<value>', fieldIds: '<value>', refTableId: '<value>', refFieldIds: '<value>', deleteAction: '<value>', updateAction: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all foreignKeyConstraint records

```typescript
const items = await db.foreignKeyConstraint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a foreignKeyConstraint

```typescript
const item = await db.foreignKeyConstraint.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', description: 'value', smartTags: 'value', type: 'value', fieldIds: 'value', refTableId: 'value', refFieldIds: 'value', deleteAction: 'value', updateAction: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value' },
  select: { id: true }
}).execute();
```
