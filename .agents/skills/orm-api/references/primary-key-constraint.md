# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PrimaryKeyConstraint records

## Usage

```typescript
db.primaryKeyConstraint.findMany({ select: { id: true } }).execute()
db.primaryKeyConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.primaryKeyConstraint.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all primaryKeyConstraint records

```typescript
const items = await db.primaryKeyConstraint.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a primaryKeyConstraint

```typescript
const item = await db.primaryKeyConstraint.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', fieldIds: '<UUID>', initiallyDeferred: '<Boolean>', isDeferrable: '<Boolean>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', type: '<String>', withoutOverlaps: '<Boolean>' },
  select: { id: true }
}).execute();
```
