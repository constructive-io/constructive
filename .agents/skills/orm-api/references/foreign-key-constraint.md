# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ForeignKeyConstraint records

## Usage

```typescript
db.foreignKeyConstraint.findMany({ select: { id: true } }).execute()
db.foreignKeyConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.foreignKeyConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', deleteAction: '<String>', description: '<String>', fieldIds: '<UUID>', name: '<String>', refFieldIds: '<UUID>', refTableId: '<UUID>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', updateAction: '<String>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all foreignKeyConstraint records

```typescript
const items = await db.foreignKeyConstraint.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a foreignKeyConstraint

```typescript
const item = await db.foreignKeyConstraint.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', deleteAction: '<String>', description: '<String>', fieldIds: '<UUID>', name: '<String>', refFieldIds: '<UUID>', refTableId: '<UUID>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', updateAction: '<String>' },
  select: { id: true }
}).execute();
```
