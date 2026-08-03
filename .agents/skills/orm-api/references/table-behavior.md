# tableBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TableBehavior records

## Usage

```typescript
db.tableBehavior.findMany({ select: { id: true } }).execute()
db.tableBehavior.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.tableBehavior.create({ data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', tableId: '<UUID>' }, select: { id: true } }).execute()
db.tableBehavior.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.tableBehavior.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all tableBehavior records

```typescript
const items = await db.tableBehavior.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a tableBehavior

```typescript
const item = await db.tableBehavior.create({
  data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', tableId: '<UUID>' },
  select: { id: true }
}).execute();
```
