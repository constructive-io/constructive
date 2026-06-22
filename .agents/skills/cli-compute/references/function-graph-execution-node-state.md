# functionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphExecutionNodeState records via csdk CLI

## Usage

```bash
csdk function-graph-execution-node-state list
csdk function-graph-execution-node-state list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-execution-node-state list --limit 10 --after <cursor>
csdk function-graph-execution-node-state find-first --where.<field>.<op> <value>
csdk function-graph-execution-node-state get --id <UUID>
csdk function-graph-execution-node-state create --executionId <UUID> --databaseId <UUID> --nodeName <String> [--nodePath <String>] [--status <String>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--errorCode <String>] [--errorMessage <String>] [--outputId <UUID>]
csdk function-graph-execution-node-state update --id <UUID> [--executionId <UUID>] [--databaseId <UUID>] [--nodeName <String>] [--nodePath <String>] [--status <String>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--errorCode <String>] [--errorMessage <String>] [--outputId <UUID>]
csdk function-graph-execution-node-state delete --id <UUID>
```

## Examples

### List functionGraphExecutionNodeState records

```bash
csdk function-graph-execution-node-state list
```

### List functionGraphExecutionNodeState records with pagination

```bash
csdk function-graph-execution-node-state list --limit 10 --offset 0
```

### List functionGraphExecutionNodeState records with cursor pagination

```bash
csdk function-graph-execution-node-state list --limit 10 --after <cursor>
```

### Find first matching functionGraphExecutionNodeState

```bash
csdk function-graph-execution-node-state find-first --where.id.equalTo <value>
```

### List functionGraphExecutionNodeState records with field selection

```bash
csdk function-graph-execution-node-state list --select id,id
```

### List functionGraphExecutionNodeState records with filtering and ordering

```bash
csdk function-graph-execution-node-state list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphExecutionNodeState

```bash
csdk function-graph-execution-node-state create --executionId <UUID> --databaseId <UUID> --nodeName <String> [--nodePath <String>] [--status <String>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--errorCode <String>] [--errorMessage <String>] [--outputId <UUID>]
```

### Get a functionGraphExecutionNodeState by id

```bash
csdk function-graph-execution-node-state get --id <value>
```
