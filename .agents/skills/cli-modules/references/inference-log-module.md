# inferenceLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InferenceLogModule records via csdk CLI

## Usage

```bash
csdk inference-log-module list
csdk inference-log-module list --where.<field>.<op> <value> --orderBy <values>
csdk inference-log-module list --limit 10 --after <cursor>
csdk inference-log-module find-first --where.<field>.<op> <value>
csdk inference-log-module get --id <UUID>
csdk inference-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk inference-log-module update --id <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityFkTableId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
csdk inference-log-module delete --id <UUID>
```

## Examples

### List inferenceLogModule records

```bash
csdk inference-log-module list
```

### List inferenceLogModule records with pagination

```bash
csdk inference-log-module list --limit 10 --offset 0
```

### List inferenceLogModule records with cursor pagination

```bash
csdk inference-log-module list --limit 10 --after <cursor>
```

### Find first matching inferenceLogModule

```bash
csdk inference-log-module find-first --where.id.equalTo <value>
```

### List inferenceLogModule records with field selection

```bash
csdk inference-log-module list --select id,id
```

### List inferenceLogModule records with filtering and ordering

```bash
csdk inference-log-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a inferenceLogModule

```bash
csdk inference-log-module create --databaseId <UUID> [--actorFkTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityFkTableId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--interval <String>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>] [--usageSummaryTableId <UUID>] [--usageSummaryTableName <String>]
```

### Get a inferenceLogModule by id

```bash
csdk inference-log-module get --id <value>
```
