# orm-appAchievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

This table represents the users progress for particular level requirements, tallying the total count. This table is updated via triggers and should not be updated maually.

## Usage

```typescript
db.appAchievement.findMany({ select: { id: true } }).execute()
db.appAchievement.findOne({ id: '<value>', select: { id: true } }).execute()
db.appAchievement.create({ data: { actorId: '<value>', name: '<value>', count: '<value>' }, select: { id: true } }).execute()
db.appAchievement.update({ where: { id: '<value>' }, data: { actorId: '<new>' }, select: { id: true } }).execute()
db.appAchievement.delete({ where: { id: '<value>' } }).execute()
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
  data: { actorId: 'value', name: 'value', count: 'value' },
  select: { id: true }
}).execute();
```
