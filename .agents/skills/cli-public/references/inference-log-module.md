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
csdk inference-log-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--prefix <String>]
csdk inference-log-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--prefix <String>]
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
csdk inference-log-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--inferenceLogTableId <UUID>] [--inferenceLogTableName <String>] [--usageDailyTableId <UUID>] [--usageDailyTableName <String>] [--interval <String>] [--retention <String>] [--premake <Int>] [--prefix <String>]
```

### Get a inferenceLogModule by id

```bash
csdk inference-log-module get --id <value>
```
