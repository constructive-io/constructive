# appEventAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually

## Usage

```typescript
db.appEventAggregate.findMany({ select: { id: true } }).execute()
db.appEventAggregate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appEventAggregate.create({ data: { actorId: '<UUID>', count: '<Int>', name: '<String>', periodStart: '<Datetime>' }, select: { id: true } }).execute()
db.appEventAggregate.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appEventAggregate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appEventAggregate records

```typescript
const items = await db.appEventAggregate.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appEventAggregate

```typescript
const item = await db.appEventAggregate.create({
  data: { actorId: '<UUID>', count: '<Int>', name: '<String>', periodStart: '<Datetime>' },
  select: { id: true }
}).execute();
```
