# databaseGraphStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseGraphStore records via csdk CLI

## Usage

```bash
csdk database-graph-store list
csdk database-graph-store list --where.<field>.<op> <value> --orderBy <values>
csdk database-graph-store list --limit 10 --after <cursor>
csdk database-graph-store find-first --where.<field>.<op> <value>
csdk database-graph-store get --id <UUID>
csdk database-graph-store create --databaseId <UUID> --name <String> [--hash <UUID>]
csdk database-graph-store update --id <UUID> [--databaseId <UUID>] [--hash <UUID>] [--name <String>]
csdk database-graph-store delete --id <UUID>
```

## Examples

### List databaseGraphStore records

```bash
csdk database-graph-store list
```

### List databaseGraphStore records with pagination

```bash
csdk database-graph-store list --limit 10 --offset 0
```

### List databaseGraphStore records with cursor pagination

```bash
csdk database-graph-store list --limit 10 --after <cursor>
```

### Find first matching databaseGraphStore

```bash
csdk database-graph-store find-first --where.id.equalTo <value>
```

### List databaseGraphStore records with field selection

```bash
csdk database-graph-store list --select id,id
```

### List databaseGraphStore records with filtering and ordering

```bash
csdk database-graph-store list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseGraphStore

```bash
csdk database-graph-store create --databaseId <UUID> --name <String> [--hash <UUID>]
```

### Get a databaseGraphStore by id

```bash
csdk database-graph-store get --id <value>
```
