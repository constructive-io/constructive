---
name: hooks-public-levels-module
description: React Query hooks for LevelsModule data operations
---

# hooks-public-levels-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LevelsModule data operations

## Usage

```typescript
useLevelsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useLevelsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useCreateLevelsModuleMutation({ selection: { fields: { id: true } } })
useUpdateLevelsModuleMutation({ selection: { fields: { id: true } } })
useDeleteLevelsModuleMutation({})
```

## Examples

### List all levelsModules

```typescript
const { data, isLoading } = useLevelsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } },
});
```

### Create a levelsModule

```typescript
const { mutate } = useCreateLevelsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', stepsTableId: '<value>', stepsTableName: '<value>', achievementsTableId: '<value>', achievementsTableName: '<value>', levelsTableId: '<value>', levelsTableName: '<value>', levelRequirementsTableId: '<value>', levelRequirementsTableName: '<value>', completedStep: '<value>', incompletedStep: '<value>', tgAchievement: '<value>', tgAchievementToggle: '<value>', tgAchievementToggleBoolean: '<value>', tgAchievementBoolean: '<value>', upsertAchievement: '<value>', tgUpdateAchievements: '<value>', stepsRequired: '<value>', levelAchieved: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>' });
```
