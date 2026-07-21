# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Field records

## Usage

```typescript
db.field.findMany({ select: { id: true } }).execute()
db.field.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.field.create({ data: { apiRequired: '<Boolean>', category: '<ObjectCategory>', chk: '<JSON>', chkExpr: '<JSON>', databaseId: '<UUID>', defaultValue: '<JSON>', description: '<String>', fieldOrder: '<Int>', generationExpression: '<JSON>', generationType: '<String>', isRequired: '<Boolean>', label: '<String>', max: '<Float>', min: '<Float>', name: '<String>', regexp: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<JSON>' }, select: { id: true } }).execute()
db.field.update({ where: { id: '<UUID>' }, data: { apiRequired: '<Boolean>' }, select: { id: true } }).execute()
db.field.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all field records

```typescript
const items = await db.field.findMany({
  select: { id: true, apiRequired: true }
}).execute();
```

### Create a field

```typescript
const item = await db.field.create({
  data: { apiRequired: '<Boolean>', category: '<ObjectCategory>', chk: '<JSON>', chkExpr: '<JSON>', databaseId: '<UUID>', defaultValue: '<JSON>', description: '<String>', fieldOrder: '<Int>', generationExpression: '<JSON>', generationType: '<String>', isRequired: '<Boolean>', label: '<String>', max: '<Float>', min: '<Float>', name: '<String>', regexp: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<JSON>' },
  select: { id: true }
}).execute();
```
