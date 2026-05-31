# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PrimaryKeyConstraint records

## Usage

```typescript
db.primaryKeyConstraint.findMany({ select: { id: true } }).execute()
db.primaryKeyConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.primaryKeyConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.primaryKeyConstraint.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', type: '<String>', fieldIds: '<UUID>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
