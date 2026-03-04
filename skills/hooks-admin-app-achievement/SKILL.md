---
name: hooks-admin-app-achievement
description: Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually
---

# hooks-admin-app-achievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually

## Usage

```typescript
useAppAchievementsQuery({ selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } } })
useAppAchievementQuery({ id: '<value>', selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } } })
useCreateAppAchievementMutation({ selection: { fields: { id: true } } })
useUpdateAppAchievementMutation({ selection: { fields: { id: true } } })
useDeleteAppAchievementMutation({})
```

## Examples

### List all appAchievements

```typescript
const { data, isLoading } = useAppAchievementsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});
```

### Create a appAchievement

```typescript
const { mutate } = useCreateAppAchievementMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<value>', name: '<value>', count: '<value>' });
```
