# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Field records

## Usage

```typescript
db.field.findMany({ select: { id: true } }).execute()
db.field.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.field.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<String>', defaultValueAst: '<JSON>', type: '<String>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' }, select: { id: true } }).execute()
db.field.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.field.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', smartTags: '<JSON>', isRequired: '<Boolean>', apiRequired: '<Boolean>', defaultValue: '<String>', defaultValueAst: '<JSON>', type: '<String>', fieldOrder: '<Int>', regexp: '<String>', chk: '<JSON>', chkExpr: '<JSON>', min: '<Float>', max: '<Float>', tags: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>' },
  select: { id: true }
}).execute();
```
