# appEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Partitioned append-only log of individual user actions; every single event ever recorded

## Usage

```typescript
db.appEvent.findMany({ select: { id: true } }).execute()
db.appEvent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appEvent.create({ data: { actorId: '<UUID>', count: '<Int>', name: '<String>' }, select: { id: true } }).execute()
db.appEvent.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appEvent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appEvent records

```typescript
const items = await db.appEvent.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appEvent

```typescript
const item = await db.appEvent.create({
  data: { actorId: '<UUID>', count: '<Int>', name: '<String>' },
  select: { id: true }
}).execute();
```
