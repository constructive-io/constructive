# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EventsModule data operations

## Usage

```typescript
useEventsModulesQuery({ selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, expireGrants: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recomputeCapabilities: true, recordEvent: true, removeEvent: true, retention: true, revokeAchievement: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgLevelGrantSync: true, tgUpdateAggregates: true, trustLadder: true, upsertAggregate: true } } })
useEventsModuleQuery({ id: '<UUID>', selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, expireGrants: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recomputeCapabilities: true, recordEvent: true, removeEvent: true, retention: true, revokeAchievement: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgLevelGrantSync: true, tgUpdateAggregates: true, trustLadder: true, upsertAggregate: true } } })
useCreateEventsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEventsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEventsModuleMutation({})
```

## Examples

### List all eventsModules

```typescript
const { data, isLoading } = useEventsModulesQuery({
  selection: { fields: { achievementRewardsTableId: true, achievementRewardsTableName: true, actorTableId: true, apiName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, eventAggregatesTableId: true, eventAggregatesTableName: true, eventTypesTableId: true, eventTypesTableName: true, eventsTableId: true, eventsTableName: true, expireGrants: true, grantAchievement: true, id: true, interval: true, levelAchieved: true, levelGrantsTableId: true, levelGrantsTableName: true, levelRequirementsTableId: true, levelRequirementsTableName: true, levelsTableId: true, levelsTableName: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recomputeCapabilities: true, recordEvent: true, removeEvent: true, retention: true, revokeAchievement: true, schemaId: true, scope: true, stepsRequired: true, tgAchievementReward: true, tgCheckAchievements: true, tgEvent: true, tgEventBool: true, tgEventToggle: true, tgEventToggleBool: true, tgLevelGrantSync: true, tgUpdateAggregates: true, trustLadder: true, upsertAggregate: true } },
});
```

### Create a eventsModule

```typescript
const { mutate } = useCreateEventsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', expireGrants: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recomputeCapabilities: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', revokeAchievement: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgLevelGrantSync: '<String>', tgUpdateAggregates: '<String>', trustLadder: '<JSON>', upsertAggregate: '<String>' });
```
