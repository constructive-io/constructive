# orm-checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CheckConstraint records

## Usage

```typescript
db.checkConstraint.findMany({ select: { id: true } }).execute()
db.checkConstraint.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.checkConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', expr: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute()
db.checkConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.checkConstraint.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all checkConstraint records

```typescript
const items = await db.checkConstraint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a checkConstraint

```typescript
const item = await db.checkConstraint.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', type: 'value', fieldIds: 'value', expr: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value' },
  select: { id: true }
}).execute();
```
