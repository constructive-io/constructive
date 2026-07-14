# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EventsModule records

## Usage

```typescript
db.eventsModule.findMany({ select: { id: true } }).execute()
db.eventsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.eventsModule.create({ data: { achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgUpdateAggregates: '<String>', upsertAggregate: '<String>' }, select: { id: true } }).execute()
db.eventsModule.update({ where: { id: '<UUID>' }, data: { achievementRewardsTableId: '<UUID>' }, select: { id: true } }).execute()
db.eventsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all eventsModule records

```typescript
const items = await db.eventsModule.findMany({
  select: { id: true, achievementRewardsTableId: true }
}).execute();
```

### Create a eventsModule

```typescript
const item = await db.eventsModule.create({
  data: { achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', actorTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', entityField: '<String>', entityTableId: '<UUID>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', grantAchievement: '<String>', interval: '<String>', levelAchieved: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordEvent: '<String>', removeEvent: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', stepsRequired: '<String>', tgAchievementReward: '<String>', tgCheckAchievements: '<String>', tgEvent: '<String>', tgEventBool: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgUpdateAggregates: '<String>', upsertAggregate: '<String>' },
  select: { id: true }
}).execute();
```
