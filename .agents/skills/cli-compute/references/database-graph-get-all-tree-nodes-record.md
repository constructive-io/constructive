# databaseGraphGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseGraphGetAllTreeNodesRecord records via csdk CLI

## Usage

```bash
csdk database-graph-get-all-tree-nodes-record list
csdk database-graph-get-all-tree-nodes-record list --where.<field>.<op> <value> --orderBy <values>
csdk database-graph-get-all-tree-nodes-record list --limit 10 --after <cursor>
csdk database-graph-get-all-tree-nodes-record find-first --where.<field>.<op> <value>
csdk database-graph-get-all-tree-nodes-record get --id <UUID>
csdk database-graph-get-all-tree-nodes-record create --data <JSON> --path <String>
csdk database-graph-get-all-tree-nodes-record update --id <UUID> [--data <JSON>] [--path <String>]
csdk database-graph-get-all-tree-nodes-record delete --id <UUID>
```

## Examples

### List databaseGraphGetAllTreeNodesRecord records

```bash
csdk database-graph-get-all-tree-nodes-record list
```

### List databaseGraphGetAllTreeNodesRecord records with pagination

```bash
csdk database-graph-get-all-tree-nodes-record list --limit 10 --offset 0
```

### List databaseGraphGetAllTreeNodesRecord records with cursor pagination

```bash
csdk database-graph-get-all-tree-nodes-record list --limit 10 --after <cursor>
```

### Find first matching databaseGraphGetAllTreeNodesRecord

```bash
csdk database-graph-get-all-tree-nodes-record find-first --where.id.equalTo <value>
```

### List databaseGraphGetAllTreeNodesRecord records with field selection

```bash
csdk database-graph-get-all-tree-nodes-record list --select id,id
```

### List databaseGraphGetAllTreeNodesRecord records with filtering and ordering

```bash
csdk database-graph-get-all-tree-nodes-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseGraphGetAllTreeNodesRecord

```bash
csdk database-graph-get-all-tree-nodes-record create --data <JSON> --path <String>
```

### Get a databaseGraphGetAllTreeNodesRecord by id

```bash
csdk database-graph-get-all-tree-nodes-record get --id <value>
```
