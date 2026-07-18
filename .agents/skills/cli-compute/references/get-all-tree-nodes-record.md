# getAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for GetAllTreeNodesRecord records via csdk CLI

## Usage

```bash
csdk get-all-tree-nodes-record list
csdk get-all-tree-nodes-record list --where.<field>.<op> <value> --orderBy <values>
csdk get-all-tree-nodes-record list --limit 10 --after <cursor>
csdk get-all-tree-nodes-record find-first --where.<field>.<op> <value>
csdk get-all-tree-nodes-record get --id <UUID>
csdk get-all-tree-nodes-record create --data <JSON> --path <String>
csdk get-all-tree-nodes-record update --id <UUID> [--data <JSON>] [--path <String>]
csdk get-all-tree-nodes-record delete --id <UUID>
```

## Examples

### List getAllTreeNodesRecord records

```bash
csdk get-all-tree-nodes-record list
```

### List getAllTreeNodesRecord records with pagination

```bash
csdk get-all-tree-nodes-record list --limit 10 --offset 0
```

### List getAllTreeNodesRecord records with cursor pagination

```bash
csdk get-all-tree-nodes-record list --limit 10 --after <cursor>
```

### Find first matching getAllTreeNodesRecord

```bash
csdk get-all-tree-nodes-record find-first --where.id.equalTo <value>
```

### List getAllTreeNodesRecord records with field selection

```bash
csdk get-all-tree-nodes-record list --select id,id
```

### List getAllTreeNodesRecord records with filtering and ordering

```bash
csdk get-all-tree-nodes-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a getAllTreeNodesRecord

```bash
csdk get-all-tree-nodes-record create --data <JSON> --path <String>
```

### Get a getAllTreeNodesRecord by id

```bash
csdk get-all-tree-nodes-record get --id <value>
```
