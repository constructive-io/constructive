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
csdk compute-log-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--actorFkTableId <UUID>] [--entityFkTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
csdk compute-log-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--actorFkTableId <UUID>] [--entityFkTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
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
csdk compute-log-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--computeLogTableId <UUID>] [--computeLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--scope <String>] [--actorFkTableId <UUID>] [--entityFkTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>]
```

### Get a computeLogModule by id

```bash
csdk compute-log-module get --id <value>
```
