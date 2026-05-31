# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ForeignKeyConstraint records

## Usage

```typescript
db.foreignKeyConstraint.findMany({ select: { id: true } }).execute()
db.foreignKeyConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.foreignKeyConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', refTableId: '<UUID>', refFieldIds: '<UUID>', deleteAction: '<String>', updateAction: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.foreignKeyConstraint.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', refTableId: '<UUID>', refFieldIds: '<UUID>', deleteAction: '<String>', updateAction: '<String>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
