# infraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraGetAllTreeNodesRecord records via csdk CLI

## Usage

```bash
csdk infra-get-all-tree-nodes-record list
csdk infra-get-all-tree-nodes-record list --where.<field>.<op> <value> --orderBy <values>
csdk infra-get-all-tree-nodes-record list --limit 10 --after <cursor>
csdk infra-get-all-tree-nodes-record find-first --where.<field>.<op> <value>
csdk infra-get-all-tree-nodes-record get --id <UUID>
csdk infra-get-all-tree-nodes-record create --data <JSON> --path <String>
csdk infra-get-all-tree-nodes-record update --id <UUID> [--data <JSON>] [--path <String>]
csdk infra-get-all-tree-nodes-record delete --id <UUID>
```

## Examples

### List infraGetAllTreeNodesRecord records

```bash
csdk infra-get-all-tree-nodes-record list
```

### List infraGetAllTreeNodesRecord records with pagination

```bash
csdk infra-get-all-tree-nodes-record list --limit 10 --offset 0
```

### List infraGetAllTreeNodesRecord records with cursor pagination

```bash
csdk infra-get-all-tree-nodes-record list --limit 10 --after <cursor>
```

### Find first matching infraGetAllTreeNodesRecord

```bash
csdk infra-get-all-tree-nodes-record find-first --where.id.equalTo <value>
```

### List infraGetAllTreeNodesRecord records with field selection

```bash
csdk infra-get-all-tree-nodes-record list --select id,id
```

### List infraGetAllTreeNodesRecord records with filtering and ordering

```bash
csdk infra-get-all-tree-nodes-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraGetAllTreeNodesRecord

```bash
csdk infra-get-all-tree-nodes-record create --data <JSON> --path <String>
```

### Get a infraGetAllTreeNodesRecord by id

```bash
csdk infra-get-all-tree-nodes-record get --id <value>
```
