# dbUsageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DbUsageModule records via csdk CLI

## Usage

```bash
csdk db-usage-module list
csdk db-usage-module list --where.<field>.<op> <value> --orderBy <values>
csdk db-usage-module list --limit 10 --after <cursor>
csdk db-usage-module find-first --where.<field>.<op> <value>
csdk db-usage-module get --id <UUID>
csdk db-usage-module create --databaseId <UUID> [--apiName <String>] [--collectDbQueryStatsFunction <String>] [--collectDbTableStatsFunction <String>] [--defaultPermissions <String>] [--entityField <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--queryStatsDailyTableId <UUID>] [--queryStatsDailyTableName <String>] [--queryStatsLogTableId <UUID>] [--queryStatsLogTableName <String>] [--retention <String>] [--rollupDbQueryStatsDailyFunction <String>] [--rollupDbTableStatsDailyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableStatsDailyTableId <UUID>] [--tableStatsDailyTableName <String>] [--tableStatsLogTableId <UUID>] [--tableStatsLogTableName <String>]
csdk db-usage-module update --id <UUID> [--apiName <String>] [--collectDbQueryStatsFunction <String>] [--collectDbTableStatsFunction <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--queryStatsDailyTableId <UUID>] [--queryStatsDailyTableName <String>] [--queryStatsLogTableId <UUID>] [--queryStatsLogTableName <String>] [--retention <String>] [--rollupDbQueryStatsDailyFunction <String>] [--rollupDbTableStatsDailyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableStatsDailyTableId <UUID>] [--tableStatsDailyTableName <String>] [--tableStatsLogTableId <UUID>] [--tableStatsLogTableName <String>]
csdk db-usage-module delete --id <UUID>
```

## Examples

### List dbUsageModule records

```bash
csdk db-usage-module list
```

### List dbUsageModule records with pagination

```bash
csdk db-usage-module list --limit 10 --offset 0
```

### List dbUsageModule records with cursor pagination

```bash
csdk db-usage-module list --limit 10 --after <cursor>
```

### Find first matching dbUsageModule

```bash
csdk db-usage-module find-first --where.id.equalTo <value>
```

### List dbUsageModule records with field selection

```bash
csdk db-usage-module list --select id,id
```

### List dbUsageModule records with filtering and ordering

```bash
csdk db-usage-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dbUsageModule

```bash
csdk db-usage-module create --databaseId <UUID> [--apiName <String>] [--collectDbQueryStatsFunction <String>] [--collectDbTableStatsFunction <String>] [--defaultPermissions <String>] [--entityField <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--queryStatsDailyTableId <UUID>] [--queryStatsDailyTableName <String>] [--queryStatsLogTableId <UUID>] [--queryStatsLogTableName <String>] [--retention <String>] [--rollupDbQueryStatsDailyFunction <String>] [--rollupDbTableStatsDailyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableStatsDailyTableId <UUID>] [--tableStatsDailyTableName <String>] [--tableStatsLogTableId <UUID>] [--tableStatsLogTableName <String>]
```

### Get a dbUsageModule by id

```bash
csdk db-usage-module get --id <value>
```
