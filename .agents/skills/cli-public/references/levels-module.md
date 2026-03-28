# levelsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for LevelsModule records via csdk CLI

## Usage

```bash
csdk levels-module list
csdk levels-module list --where.<field>.<op> <value> --orderBy <values>
csdk levels-module list --limit 10 --after <cursor>
csdk levels-module find-first --where.<field>.<op> <value>
csdk levels-module get --id <UUID>
csdk levels-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--stepsTableId <UUID>] [--stepsTableName <String>] [--achievementsTableId <UUID>] [--achievementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--completedStep <String>] [--incompletedStep <String>] [--tgAchievement <String>] [--tgAchievementToggle <String>] [--tgAchievementToggleBoolean <String>] [--tgAchievementBoolean <String>] [--upsertAchievement <String>] [--tgUpdateAchievements <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk levels-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--stepsTableId <UUID>] [--stepsTableName <String>] [--achievementsTableId <UUID>] [--achievementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--completedStep <String>] [--incompletedStep <String>] [--tgAchievement <String>] [--tgAchievementToggle <String>] [--tgAchievementToggleBoolean <String>] [--tgAchievementBoolean <String>] [--upsertAchievement <String>] [--tgUpdateAchievements <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--prefix <String>] [--membershipType <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk levels-module delete --id <UUID>
```

## Examples

### List levelsModule records

```bash
csdk levels-module list
```

### List levelsModule records with pagination

```bash
csdk levels-module list --limit 10 --offset 0
```

### List levelsModule records with cursor pagination

```bash
csdk levels-module list --limit 10 --after <cursor>
```

### Find first matching levelsModule

```bash
csdk levels-module find-first --where.id.equalTo <value>
```

### List levelsModule records with field selection

```bash
csdk levels-module list --select id,id
```

### List levelsModule records with filtering and ordering

```bash
csdk levels-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a levelsModule

```bash
csdk levels-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--stepsTableId <UUID>] [--stepsTableName <String>] [--achievementsTableId <UUID>] [--achievementsTableName <String>] [--levelsTableId <UUID>] [--levelsTableName <String>] [--levelRequirementsTableId <UUID>] [--levelRequirementsTableName <String>] [--completedStep <String>] [--incompletedStep <String>] [--tgAchievement <String>] [--tgAchievementToggle <String>] [--tgAchievementToggleBoolean <String>] [--tgAchievementBoolean <String>] [--upsertAchievement <String>] [--tgUpdateAchievements <String>] [--stepsRequired <String>] [--levelAchieved <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
```

### Get a levelsModule by id

```bash
csdk levels-module get --id <value>
```
