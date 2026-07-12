# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EventsModule data operations

## Usage

```typescript
useEventsModulesQuery({ selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useEventsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } } })
useCreateEventsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEventsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEventsModuleMutation({})
```

## Examples

### List all eventsModules

```typescript
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { id: true, databaseId: true, entityField: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, eventsTableId: true, eventsTableName: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, levelsTableId: true, levelsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelGrantsTableId: true, levelGrantsTableName: true, achievementRewardsTableId: true, achievementRewardsTableName: true, recordEvent: true, removeEvent: true, tgEvent: true, tgEventToggle: true, tgEventToggleBool: true, tgEventBool: true, upsertAggregate: true, tgUpdateAggregates: true, stepsRequired: true, levelAchieved: true, tgCheckAchievements: true, grantAchievement: true, tgAchievementReward: true, interval: true, retention: true, premake: true, scope: true, prefix: true, entityTableId: true, actorTableId: true, defaultPermissions: true, apiName: true, privateApiName: true } },
});
```

### Create a eventsModule

```typescript
const { mutate } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' });
```
