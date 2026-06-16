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
csdk events-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--recordEvent <String>] [--removeEvent <String>] [--tgEvent <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgEventBool <String>] [--upsertAggregate <String>] [--tgUpdateAggregates <String>] [--pruneEvents <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--tgCheckAchievements <String>] [--grantAchievement <String>] [--tgAchievementReward <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
csdk events-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--recordEvent <String>] [--removeEvent <String>] [--tgEvent <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgEventBool <String>] [--upsertAggregate <String>] [--tgUpdateAggregates <String>] [--pruneEvents <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--tgCheckAchievements <String>] [--grantAchievement <String>] [--tgAchievementReward <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
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
csdk events-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--eventsTableId <UUID>] [--eventsTableName <String>] [--eventAggregatesTableId <UUID>] [--eventAggregatesTableName <String>] [--eventTypesTableId <UUID>] [--eventTypesTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--levelGrantsTableId <UUID>] [--levelGrantsTableName <String>] [--achievementRewardsTableId <UUID>] [--achievementRewardsTableName <String>] [--recordEvent <String>] [--removeEvent <String>] [--tgEvent <String>] [--tgEventToggle <String>] [--tgEventToggleBool <String>] [--tgEventBool <String>] [--upsertAggregate <String>] [--tgUpdateAggregates <String>] [--pruneEvents <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--tgCheckAchievements <String>] [--grantAchievement <String>] [--tgAchievementReward <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--defaultPermissions <String>] [--apiName <String>] [--privateApiName <String>]
```

### Get a eventsModule by id

```bash
csdk events-module get --id <value>
```
