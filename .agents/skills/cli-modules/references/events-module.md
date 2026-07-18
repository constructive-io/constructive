# eventsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EventsModule records via csdk CLI

## Usage

```bash
csdk events-module list
csdk events-module list --where.<field>.<op> <value> --orderBy <values>
csdk events-module list --limit 10 --after <cursor>
csdk events-module find-first --where.<field>.<op> <value>
csdk events-module get --id <UUID>
csdk events-module create --databaseId <UUID> [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--actorTableId <UUID>] [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--grantAchievement <String>] [--interval <String>] [--levelAchieved <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordEvent <String>] [--removeEvent <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--stepsRequired <String>] [--tgAchievementReward <String>] [--tgCheckAchievements <String>] [--tgEvent <String>] [--tgEventBool <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgUpdateAggregates <String>] [--upsertAggregate <String>]
csdk events-module update --id <UUID> [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--actorTableId <UUID>] [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--grantAchievement <String>] [--interval <String>] [--levelAchieved <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordEvent <String>] [--removeEvent <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--stepsRequired <String>] [--tgAchievementReward <String>] [--tgCheckAchievements <String>] [--tgEvent <String>] [--tgEventBool <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgUpdateAggregates <String>] [--upsertAggregate <String>]
csdk events-module delete --id <UUID>
```

## Examples

### List eventsModule records

```bash
csdk events-module list
```

### List eventsModule records with pagination

```bash
csdk events-module list --limit 10 --offset 0
```

### List eventsModule records with cursor pagination

```bash
csdk events-module list --limit 10 --after <cursor>
```

### Find first matching eventsModule

```bash
csdk events-module find-first --where.id.equalTo <value>
```

### List eventsModule records with field selection

```bash
csdk events-module list --select id,id
```

### List eventsModule records with filtering and ordering

```bash
csdk events-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a eventsModule

```bash
csdk events-module create --databaseId <UUID> [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--actorTableId <UUID>] [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--grantAchievement <String>] [--interval <String>] [--levelAchieved <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordEvent <String>] [--removeEvent <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--stepsRequired <String>] [--tgAchievementReward <String>] [--tgCheckAchievements <String>] [--tgEvent <String>] [--tgEventBool <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgUpdateAggregates <String>] [--upsertAggregate <String>]
```

### Get a eventsModule by id

```bash
csdk events-module get --id <value>
```
