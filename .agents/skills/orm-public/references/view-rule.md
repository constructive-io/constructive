# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

DO INSTEAD rules for views (e.g., read-only enforcement)

## Usage

```typescript
db.viewRule.findMany({ select: { id: true } }).execute()
db.viewRule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.viewRule.create({ data: { databaseId: '<UUID>', viewId: '<UUID>', name: '<String>', event: '<String>', action: '<String>' }, select: { id: true } }).execute()
db.viewRule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.viewRule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all viewRule records

```typescript
const items = await db.viewRule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a viewRule

```typescript
const item = await db.viewRule.create({
  data: { databaseId: '<UUID>', viewId: '<UUID>', name: '<String>', event: '<String>', action: '<String>' },
  select: { id: true }
}).execute();
```
