# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EventsModule data operations

## Usage

```typescript
useEventsModulesQuery({ selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } } })
useEventsModuleQuery({ id: '<UUID>', selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } } })
useCreateEventsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEventsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEventsModuleMutation({})
```

## Examples

### List all eventsModules

```typescript
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultPermissions: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordEvent: true, removeEvent: true, retention: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgUpdateAggregates: true, upsertAggregate: true } },
});
```

### Create a eventsModule

```typescript
const { mutate } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgUpdateAggregates: '<String>', upsertAggregate: '<String>' });
```
