# appAchievementReward

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines rewards granted when a level is achieved; supports limit_credits and meter_credits

## Usage

```typescript
db.appAchievementReward.findMany({ select: { id: true } }).execute()
db.appAchievementReward.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appAchievementReward.create({ data: { amount: '<Int>', creditType: '<String>', expiresInterval: '<Interval>', levelName: '<String>', rewardType: '<String>', targetName: '<String>' }, select: { id: true } }).execute()
db.appAchievementReward.update({ where: { id: '<UUID>' }, data: { amount: '<Int>' }, select: { id: true } }).execute()
db.appAchievementReward.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appAchievementReward records

```typescript
const items = await db.appAchievementReward.findMany({
  select: { id: true, amount: true }
}).execute();
```

### Create a appAchievementReward

```typescript
const item = await db.appAchievementReward.create({
  data: { amount: '<Int>', creditType: '<String>', expiresInterval: '<Interval>', levelName: '<String>', rewardType: '<String>', targetName: '<String>' },
  select: { id: true }
}).execute();
```
