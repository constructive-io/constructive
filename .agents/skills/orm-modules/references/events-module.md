# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for EventsModule records

## Usage

```typescript
db.eventsModule.findMany({ select: { id: true } }).execute()
db.eventsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.eventsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', pruneEvents: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.eventsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.eventsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all eventsModule records

```typescript
const items = await db.eventsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a eventsModule

```typescript
const item = await db.eventsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', eventsTableId: '<UUID>', eventsTableName: '<String>', eventAggregatesTableId: '<UUID>', eventAggregatesTableName: '<String>', eventTypesTableId: '<UUID>', eventTypesTableName: '<String>', levelsTableId: '<UUID>', levelsTableName: '<String>', levelRequirementsTableId: '<UUID>', levelRequirementsTableName: '<String>', levelGrantsTableId: '<UUID>', levelGrantsTableName: '<String>', achievementRewardsTableId: '<UUID>', achievementRewardsTableName: '<String>', recordEvent: '<String>', removeEvent: '<String>', tgEvent: '<String>', tgEventToggle: '<String>', tgEventToggleBool: '<String>', tgEventBool: '<String>', upsertAggregate: '<String>', tgUpdateAggregates: '<String>', pruneEvents: '<String>', stepsRequired: '<String>', levelAchieved: '<String>', tgCheckAchievements: '<String>', grantAchievement: '<String>', tgAchievementReward: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', actorTableId: '<UUID>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
