# sqlAction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for SqlAction records

## Usage

```typescript
db.sqlAction.findMany({ select: { id: true } }).execute()
db.sqlAction.findOne({ id: '<Int>', select: { id: true } }).execute()
db.sqlAction.create({ data: { actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' }, select: { id: true } }).execute()
db.sqlAction.update({ where: { id: '<Int>' }, data: { actionId: '<UUID>' }, select: { id: true } }).execute()
db.sqlAction.delete({ where: { id: '<Int>' } }).execute()
```

## Examples

### List all sqlAction records

```typescript
const items = await db.sqlAction.findMany({
  select: { id: true, actionId: true }
}).execute();
```

### Create a sqlAction

```typescript
const item = await db.sqlAction.create({
  data: { actionId: '<UUID>', actionName: '<String>', actorId: '<UUID>', content: '<String>', databaseId: '<UUID>', deploy: '<String>', deps: '<String>', name: '<String>', payload: '<JSON>', revert: '<String>', verify: '<String>' },
  select: { id: true }
}).execute();
```
