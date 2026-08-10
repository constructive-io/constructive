# appAchievementReward

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Defines rewards granted when a level is achieved; supports limit_credits and meter_credits

## Usage

```typescript
useAppAchievementRewardsQuery({ selection: { fields: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } } })
useAppAchievementRewardQuery({ id: '<UUID>', selection: { fields: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } } })
useCreateAppAchievementRewardMutation({ selection: { fields: { id: true } } })
useUpdateAppAchievementRewardMutation({ selection: { fields: { id: true } } })
useDeleteAppAchievementRewardMutation({})
```

## Examples

### List all appAchievementRewards

```typescript
const { data, isLoading } = useAppAchievementRewardsQuery({
  selection: { fields: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } },
});
```

### Create a appAchievementReward

```typescript
const { mutate } = useCreateAppAchievementRewardMutation({
  selection: { fields: { id: true } },
});
mutate({ amount: '<Int>', creditType: '<String>', expiresInterval: '<Interval>', levelName: '<String>', rewardType: '<String>', targetName: '<String>' });
```
