# databaseFunctionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseFunctionGraph records via csdk CLI

## Usage

```bash
csdk database-function-graph list
csdk database-function-graph list --where.<field>.<op> <value> --orderBy <values>
csdk database-function-graph list --limit 10 --after <cursor>
csdk database-function-graph find-first --where.<field>.<op> <value>
csdk database-function-graph get --id <UUID>
csdk database-function-graph create --context <String> --createdBy <UUID> --databaseId <UUID> --definitionsCommitId <UUID> --description <String> --isValid <Boolean> --name <String> --storeId <UUID> --validationErrors <JSON>
csdk database-function-graph update --id <UUID> [--context <String>] [--createdBy <UUID>] [--databaseId <UUID>] [--definitionsCommitId <UUID>] [--description <String>] [--isValid <Boolean>] [--name <String>] [--storeId <UUID>] [--validationErrors <JSON>]
csdk database-function-graph delete --id <UUID>
```

## Examples

### List databaseFunctionGraph records

```bash
csdk database-function-graph list
```

### List databaseFunctionGraph records with pagination

```bash
csdk database-function-graph list --limit 10 --offset 0
```

### List databaseFunctionGraph records with cursor pagination

```bash
csdk database-function-graph list --limit 10 --after <cursor>
```

### Find first matching databaseFunctionGraph

```bash
csdk database-function-graph find-first --where.id.equalTo <value>
```

### List databaseFunctionGraph records with field selection

```bash
csdk database-function-graph list --select id,id
```

### List databaseFunctionGraph records with filtering and ordering

```bash
csdk database-function-graph list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseFunctionGraph

```bash
csdk database-function-graph create --context <String> --createdBy <UUID> --databaseId <UUID> --definitionsCommitId <UUID> --description <String> --isValid <Boolean> --name <String> --storeId <UUID> --validationErrors <JSON>
```

### Get a databaseFunctionGraph by id

```bash
csdk database-function-graph get --id <value>
```
