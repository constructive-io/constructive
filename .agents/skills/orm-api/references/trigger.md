# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Trigger records

## Usage

```typescript
db.trigger.findMany({ select: { id: true } }).execute()
db.trigger.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.trigger.create({ data: { category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', functionName: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>' }, select: { id: true } }).execute()
db.trigger.update({ where: { id: '<UUID>' }, data: { category: '<ObjectCategory>' }, select: { id: true } }).execute()
db.trigger.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all trigger records

```typescript
const items = await db.trigger.findMany({
  select: { id: true, category: true }
}).execute();
```

### Create a trigger

```typescript
const item = await db.trigger.create({
  data: { category: '<ObjectCategory>', databaseId: '<UUID>', event: '<String>', functionName: '<String>', name: '<String>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>' },
  select: { id: true }
}).execute();
```
