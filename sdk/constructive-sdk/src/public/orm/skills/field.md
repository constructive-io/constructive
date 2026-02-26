# orm-field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Field records

## Usage

```typescript
db.field.findMany({ select: { id: true } }).execute()
db.field.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.field.create({ data: { databaseId: '<value>', tableId: '<value>', name: '<value>', label: '<value>', description: '<value>', smartTags: '<value>', isRequired: '<value>', defaultValue: '<value>', defaultValueAst: '<value>', isHidden: '<value>', type: '<value>', fieldOrder: '<value>', regexp: '<value>', chk: '<value>', chkExpr: '<value>', min: '<value>', max: '<value>', tags: '<value>', category: '<value>', module: '<value>', scope: '<value>' }, select: { id: true } }).execute()
db.field.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.field.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all field records

```typescript
const items = await db.field.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a field

```typescript
const item = await db.field.create({
  data: { databaseId: 'value', tableId: 'value', name: 'value', label: 'value', description: 'value', smartTags: 'value', isRequired: 'value', defaultValue: 'value', defaultValueAst: 'value', isHidden: 'value', type: 'value', fieldOrder: 'value', regexp: 'value', chk: 'value', chkExpr: 'value', min: 'value', max: 'value', tags: 'value', category: 'value', module: 'value', scope: 'value' },
  select: { id: true }
}).execute();
```
