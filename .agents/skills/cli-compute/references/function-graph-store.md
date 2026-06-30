# functionGraphStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphStore records via csdk CLI

## Usage

```bash
csdk function-graph-store list
csdk function-graph-store list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-store list --limit 10 --after <cursor>
csdk function-graph-store find-first --where.<field>.<op> <value>
csdk function-graph-store get --id <UUID>
csdk function-graph-store create --name <String> --databaseId <UUID> [--hash <UUID>]
csdk function-graph-store update --id <UUID> [--name <String>] [--databaseId <UUID>] [--hash <UUID>]
csdk function-graph-store delete --id <UUID>
```

## Examples

### List functionGraphStore records

```bash
csdk function-graph-store list
```

### List functionGraphStore records with pagination

```bash
csdk function-graph-store list --limit 10 --offset 0
```

### List functionGraphStore records with cursor pagination

```bash
csdk function-graph-store list --limit 10 --after <cursor>
```

### Find first matching functionGraphStore

```bash
csdk function-graph-store find-first --where.id.equalTo <value>
```

### List functionGraphStore records with field selection

```bash
csdk function-graph-store list --select id,id
```

### List functionGraphStore records with filtering and ordering

```bash
csdk function-graph-store list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphStore

```bash
csdk function-graph-store create --name <String> --databaseId <UUID> [--hash <UUID>]
```

### Get a functionGraphStore by id

```bash
csdk function-graph-store get --id <value>
```
