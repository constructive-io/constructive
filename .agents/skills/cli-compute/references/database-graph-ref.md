# databaseGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseGraphRef records via csdk CLI

## Usage

```bash
csdk database-graph-ref list
csdk database-graph-ref list --where.<field>.<op> <value> --orderBy <values>
csdk database-graph-ref list --limit 10 --after <cursor>
csdk database-graph-ref find-first --where.<field>.<op> <value>
csdk database-graph-ref get --id <UUID>
csdk database-graph-ref create --databaseId <UUID> --name <String> --storeId <UUID> [--commitId <UUID>]
csdk database-graph-ref update --id <UUID> [--commitId <UUID>] [--databaseId <UUID>] [--name <String>] [--storeId <UUID>]
csdk database-graph-ref delete --id <UUID>
```

## Examples

### List databaseGraphRef records

```bash
csdk database-graph-ref list
```

### List databaseGraphRef records with pagination

```bash
csdk database-graph-ref list --limit 10 --offset 0
```

### List databaseGraphRef records with cursor pagination

```bash
csdk database-graph-ref list --limit 10 --after <cursor>
```

### Find first matching databaseGraphRef

```bash
csdk database-graph-ref find-first --where.id.equalTo <value>
```

### List databaseGraphRef records with field selection

```bash
csdk database-graph-ref list --select id,id
```

### List databaseGraphRef records with filtering and ordering

```bash
csdk database-graph-ref list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseGraphRef

```bash
csdk database-graph-ref create --databaseId <UUID> --name <String> --storeId <UUID> [--commitId <UUID>]
```

### Get a databaseGraphRef by id

```bash
csdk database-graph-ref get --id <value>
```
