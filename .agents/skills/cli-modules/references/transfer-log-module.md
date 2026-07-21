# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TransferLogModule records via csdk CLI

## Usage

```bash
csdk transfer-log-module list
csdk transfer-log-module list --where.<field>.<op> <value> --orderBy <values>
csdk transfer-log-module list --limit 10 --after <cursor>
csdk transfer-log-module find-first --where.<field>.<op> <value>
csdk transfer-log-module get --id <UUID>
csdk transfer-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--transferLogTableId <UUID>] [--transferLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk transfer-log-module update --id <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--transferLogTableId <UUID>] [--transferLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk transfer-log-module delete --id <UUID>
```

## Examples

### List transferLogModule records

```bash
csdk transfer-log-module list
```

### List transferLogModule records with pagination

```bash
csdk transfer-log-module list --limit 10 --offset 0
```

### List transferLogModule records with cursor pagination

```bash
csdk transfer-log-module list --limit 10 --after <cursor>
```

### Find first matching transferLogModule

```bash
csdk transfer-log-module find-first --where.id.equalTo <value>
```

### List transferLogModule records with field selection

```bash
csdk transfer-log-module list --select id,id
```

### List transferLogModule records with filtering and ordering

```bash
csdk transfer-log-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a transferLogModule

```bash
csdk transfer-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--transferLogTableId <UUID>] [--transferLogTableName <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
```

### Get a transferLogModule by id

```bash
csdk transfer-log-module get --id <value>
```
