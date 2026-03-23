# levelsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for LevelsModule data operations

## Usage

```typescript
useLevelsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
useLevelsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, stepsTableId: true, stepsTableName: true, achievementsTableId: true, achievementsTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, completedStep: true, incompletedStep: true, tgAchievement: true, tgAchievementToggle: true, tgAchievementToggleBoolean: true, tgAchievementBoolean: true, upsertAchievement: true, tgUpdateAchievements: true, stepsRequired: true, levelAchieved: true, prefix: true, membershipType: true, entityTableId: true, actorTableId: true } } })
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
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', stepsTableId: '<UUID>', stepsTableName: '<String>', achievementsTableId: '<UUID>', achievementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', completedStep: '<String>', incompletedStep: '<String>', tgAchievement: '<String>', tgAchievementToggle: '<String>', tgAchievementToggleBoolean: '<String>', tgAchievementBoolean: '<String>', upsertAchievement: '<String>', tgUpdateAchievements: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', prefix: '<String>', membershipType: '<Int>', entityTableId: '<UUID>', actorTableId: '<UUID>' });
```
