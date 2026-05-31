# userStateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserStateModule records via csdk CLI

## Usage

```bash
csdk user-state-module list
csdk user-state-module list --where.<field>.<op> <value> --orderBy <values>
csdk user-state-module list --limit 10 --after <cursor>
csdk user-state-module find-first --where.<field>.<op> <value>
csdk user-state-module get --id <UUID>
csdk user-state-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-state-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-state-module delete --id <UUID>
```

## Examples

### List userStateModule records

```bash
csdk user-state-module list
```

### List userStateModule records with pagination

```bash
csdk user-state-module list --limit 10 --offset 0
```

### List userStateModule records with cursor pagination

```bash
csdk user-state-module list --limit 10 --after <cursor>
```

### Find first matching userStateModule

```bash
csdk user-state-module find-first --where.id.equalTo <value>
```

### List userStateModule records with field selection

```bash
csdk user-state-module list --select id,id
```

### List userStateModule records with filtering and ordering

```bash
csdk user-state-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userStateModule

```bash
csdk user-state-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a userStateModule by id

```bash
csdk user-state-module get --id <value>
```
