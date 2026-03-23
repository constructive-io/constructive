# appAchievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually

## Usage

```typescript
db.appAchievement.findMany({ select: { id: true } }).execute()
db.appAchievement.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appAchievement.create({ data: { actorId: '<UUID>', name: '<String>', count: '<Int>' }, select: { id: true } }).execute()
db.appAchievement.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appAchievement.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appAchievement records

```typescript
const items = await db.appAchievement.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appAchievement

```typescript
const item = await db.appAchievement.create({
  data: { actorId: '<UUID>', name: '<String>', count: '<Int>' },
  select: { id: true }
}).execute();
```
