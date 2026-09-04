# databaseGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseGraphObject records via csdk CLI

## Usage

```bash
csdk database-graph-object list
csdk database-graph-object list --where.<field>.<op> <value> --orderBy <values>
csdk database-graph-object list --limit 10 --after <cursor>
csdk database-graph-object find-first --where.<field>.<op> <value>
csdk database-graph-object get --id <UUID>
csdk database-graph-object create --databaseId <UUID> [--data <JSON>] [--kids <UUID>] [--ktree <String>]
csdk database-graph-object update --id <UUID> [--data <JSON>] [--databaseId <UUID>] [--kids <UUID>] [--ktree <String>]
csdk database-graph-object delete --id <UUID>
```

## Examples

### List databaseGraphObject records

```bash
csdk database-graph-object list
```

### List databaseGraphObject records with pagination

```bash
csdk database-graph-object list --limit 10 --offset 0
```

### List databaseGraphObject records with cursor pagination

```bash
csdk database-graph-object list --limit 10 --after <cursor>
```

### Find first matching databaseGraphObject

```bash
csdk database-graph-object find-first --where.id.equalTo <value>
```

### List databaseGraphObject records with field selection

```bash
csdk database-graph-object list --select id,id
```

### List databaseGraphObject records with filtering and ordering

```bash
csdk database-graph-object list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseGraphObject

```bash
csdk database-graph-object create --databaseId <UUID> [--data <JSON>] [--kids <UUID>] [--ktree <String>]
```

### Get a databaseGraphObject by id

```bash
csdk database-graph-object get --id <value>
```
