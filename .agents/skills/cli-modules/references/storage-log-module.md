# storageLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for StorageLogModule records via csdk CLI

## Usage

```bash
csdk storage-log-module list
csdk storage-log-module list --where.<field>.<op> <value> --orderBy <values>
csdk storage-log-module list --limit 10 --after <cursor>
csdk storage-log-module find-first --where.<field>.<op> <value>
csdk storage-log-module get --id <UUID>
csdk storage-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--storageLogTableId <UUID>] [--storageLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk storage-log-module update --id <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--storageLogTableId <UUID>] [--storageLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk storage-log-module delete --id <UUID>
```

## Examples

### List storageLogModule records

```bash
csdk storage-log-module list
```

### List storageLogModule records with pagination

```bash
csdk storage-log-module list --limit 10 --offset 0
```

### List storageLogModule records with cursor pagination

```bash
csdk storage-log-module list --limit 10 --after <cursor>
```

### Find first matching storageLogModule

```bash
csdk storage-log-module find-first --where.id.equalTo <value>
```

### List storageLogModule records with field selection

```bash
csdk storage-log-module list --select id,id
```

### List storageLogModule records with filtering and ordering

```bash
csdk storage-log-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a storageLogModule

```bash
csdk storage-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--storageLogTableId <UUID>] [--storageLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
```

### Get a storageLogModule by id

```bash
csdk storage-log-module get --id <value>
```
