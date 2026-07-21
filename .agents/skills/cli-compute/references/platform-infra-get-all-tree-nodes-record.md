# platformInfraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInfraGetAllTreeNodesRecord records via csdk CLI

## Usage

```bash
csdk platform-infra-get-all-tree-nodes-record list
csdk platform-infra-get-all-tree-nodes-record list --where.<field>.<op> <value> --orderBy <values>
csdk platform-infra-get-all-tree-nodes-record list --limit 10 --after <cursor>
csdk platform-infra-get-all-tree-nodes-record find-first --where.<field>.<op> <value>
csdk platform-infra-get-all-tree-nodes-record get --id <UUID>
csdk platform-infra-get-all-tree-nodes-record create --data <JSON> --path <String>
csdk platform-infra-get-all-tree-nodes-record update --id <UUID> [--data <JSON>] [--path <String>]
csdk platform-infra-get-all-tree-nodes-record delete --id <UUID>
```

## Examples

### List platformInfraGetAllTreeNodesRecord records

```bash
csdk platform-infra-get-all-tree-nodes-record list
```

### List platformInfraGetAllTreeNodesRecord records with pagination

```bash
csdk platform-infra-get-all-tree-nodes-record list --limit 10 --offset 0
```

### List platformInfraGetAllTreeNodesRecord records with cursor pagination

```bash
csdk platform-infra-get-all-tree-nodes-record list --limit 10 --after <cursor>
```

### Find first matching platformInfraGetAllTreeNodesRecord

```bash
csdk platform-infra-get-all-tree-nodes-record find-first --where.id.equalTo <value>
```

### List platformInfraGetAllTreeNodesRecord records with field selection

```bash
csdk platform-infra-get-all-tree-nodes-record list --select id,id
```

### List platformInfraGetAllTreeNodesRecord records with filtering and ordering

```bash
csdk platform-infra-get-all-tree-nodes-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInfraGetAllTreeNodesRecord

```bash
csdk platform-infra-get-all-tree-nodes-record create --data <JSON> --path <String>
```

### Get a platformInfraGetAllTreeNodesRecord by id

```bash
csdk platform-infra-get-all-tree-nodes-record get --id <value>
```
