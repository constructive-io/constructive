# triggerFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for TriggerFunction records

## Usage

```typescript
db.triggerFunction.findMany({ select: { id: true } }).execute()
db.triggerFunction.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.triggerFunction.create({ data: { databaseId: '<UUID>', name: '<String>', code: '<String>' }, select: { id: true } }).execute()
db.triggerFunction.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.triggerFunction.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all triggerFunction records

```typescript
const items = await db.triggerFunction.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a triggerFunction

```typescript
const item = await db.triggerFunction.create({
  data: { databaseId: '<UUID>', name: '<String>', code: '<String>' },
  select: { id: true }
}).execute();
```
