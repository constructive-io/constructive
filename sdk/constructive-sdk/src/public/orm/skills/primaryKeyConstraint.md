# orm-primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PrimaryKeyConstraint records

## Usage

```typescript
db.primaryKeyConstraint.findMany({ select: { id: true } }).execute()
db.primaryKeyConstraint.findOne({ id: '<value>', select: { id: true } }).execute()
db.primaryKeyConstraint.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', type: '<value>', fieldIds: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all primaryKeyConstraint records

```typescript
const items = await db.primaryKeyConstraint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a primaryKeyConstraint

```typescript
const item = await db.primaryKeyConstraint.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', type: 'value', fieldIds: 'value', smartTags: 'value', category: 'value', module: 'value', scope: 'value', tags: 'value' },
  select: { id: true }
}).execute();
```
