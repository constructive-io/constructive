# computeLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ComputeLogModule records via csdk CLI

## Usage

```bash
csdk compute-log-module list
csdk compute-log-module list --where.<field>.<op> <value> --orderBy <values>
csdk compute-log-module list --limit 10 --after <cursor>
csdk compute-log-module find-first --where.<field>.<op> <value>
csdk compute-log-module get --id <UUID>
csdk compute-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk compute-log-module update --id <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk compute-log-module delete --id <UUID>
```

## Examples

### List computeLogModule records

```bash
csdk compute-log-module list
```

### List computeLogModule records with pagination

```bash
csdk compute-log-module list --limit 10 --offset 0
```

### List computeLogModule records with cursor pagination

```bash
csdk compute-log-module list --limit 10 --after <cursor>
```

### Find first matching computeLogModule

```bash
csdk compute-log-module find-first --where.id.equalTo <value>
```

### List computeLogModule records with field selection

```bash
csdk compute-log-module list --select id,id
```

### List computeLogModule records with filtering and ordering

```bash
csdk compute-log-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a computeLogModule

```bash
csdk compute-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
```

### Get a computeLogModule by id

```bash
csdk compute-log-module get --id <value>
```
