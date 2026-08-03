# viewBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ViewBehavior records

## Usage

```typescript
db.viewBehavior.findMany({ select: { id: true } }).execute()
db.viewBehavior.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.viewBehavior.create({ data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', viewId: '<UUID>' }, select: { id: true } }).execute()
db.viewBehavior.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.viewBehavior.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all viewBehavior records

```typescript
const items = await db.viewBehavior.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a viewBehavior

```typescript
const item = await db.viewBehavior.create({
  data: { databaseId: '<UUID>', modifier: '<String>', scope: '<String>', sortOrder: '<Int>', viewId: '<UUID>' },
  select: { id: true }
}).execute();
```
