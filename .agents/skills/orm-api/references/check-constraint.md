# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CheckConstraint records

## Usage

```typescript
db.checkConstraint.findMany({ select: { id: true } }).execute()
db.checkConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.checkConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', expr: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.checkConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.checkConstraint.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', expr: '<JSON>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
