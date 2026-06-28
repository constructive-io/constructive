# functionGraph

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraph records via csdk CLI

## Usage

```bash
csdk function-graph list
csdk function-graph list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph list --limit 10 --after <cursor>
csdk function-graph find-first --where.<field>.<op> <value>
csdk function-graph get --id <UUID>
csdk function-graph create --databaseId <UUID> --storeId <UUID> --context <String> --name <String> --description <String> --definitionsCommitId <UUID> --isValid <Boolean> --validationErrors <JSON> --createdBy <UUID>
csdk function-graph update --id <UUID> [--databaseId <UUID>] [--storeId <UUID>] [--context <String>] [--name <String>] [--description <String>] [--definitionsCommitId <UUID>] [--isValid <Boolean>] [--validationErrors <JSON>] [--createdBy <UUID>]
csdk function-graph delete --id <UUID>
```

## Examples

### List functionGraph records

```bash
csdk function-graph list
```

### List functionGraph records with pagination

```bash
csdk function-graph list --limit 10 --offset 0
```

### List functionGraph records with cursor pagination

```bash
csdk function-graph list --limit 10 --after <cursor>
```

### Find first matching functionGraph

```bash
csdk function-graph find-first --where.id.equalTo <value>
```

### List functionGraph records with field selection

```bash
csdk function-graph list --select id,id
```

### List functionGraph records with filtering and ordering

```bash
csdk function-graph list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraph

```bash
csdk function-graph create --databaseId <UUID> --storeId <UUID> --context <String> --name <String> --description <String> --definitionsCommitId <UUID> --isValid <Boolean> --validationErrors <JSON> --createdBy <UUID>
```

### Get a functionGraph by id

```bash
csdk function-graph get --id <value>
```
