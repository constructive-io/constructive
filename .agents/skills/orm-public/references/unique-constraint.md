# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for UniqueConstraint records

## Usage

```typescript
db.uniqueConstraint.findMany({ select: { id: true } }).execute()
db.uniqueConstraint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.uniqueConstraint.create({ data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' }, select: { id: true } }).execute()
db.uniqueConstraint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.uniqueConstraint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all uniqueConstraint records

```typescript
const items = await db.uniqueConstraint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a uniqueConstraint

```typescript
const item = await db.uniqueConstraint.create({
  data: { databaseId: '<UUID>', tableId: '<UUID>', name: '<String>', description: '<String>', smartTags: '<JSON>', type: '<String>', fieldIds: '<UUID>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' },
  select: { id: true }
}).execute();
```
