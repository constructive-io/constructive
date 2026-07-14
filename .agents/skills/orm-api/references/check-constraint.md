# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for CheckConstraint records

## Usage

```typescript
db.checkConstraint.findMany({ select: { id: true } }).execute()
db.checkConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.checkConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', expr: '<JSON>', fieldIds: '<UUID>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' }, select: { id: true } }).execute()
db.checkConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.checkConstraint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all checkConstraint records

```typescript
const items = await db.checkConstraint.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a checkConstraint

```typescript
const item = await db.checkConstraint.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', expr: '<JSON>', fieldIds: '<UUID>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>' },
  select: { id: true }
}).execute();
```
