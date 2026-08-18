# databaseFunctionGraphExecutionNodeState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseFunctionGraphExecutionNodeState records via csdk CLI

## Usage

```bash
csdk database-function-graph-execution-node-state list
csdk database-function-graph-execution-node-state list --where.<field>.<op> <value> --orderBy <values>
csdk database-function-graph-execution-node-state list --limit 10 --after <cursor>
csdk database-function-graph-execution-node-state find-first --where.<field>.<op> <value>
csdk database-function-graph-execution-node-state get --id <UUID>
csdk database-function-graph-execution-node-state create --databaseId <UUID> --executionId <UUID> --nodeName <String> [--callbackInputs <JSON>] [--callbackMeta <JSON>] [--callbackTokenHash <String>] [--completedAt <Datetime>] [--errorCode <String>] [--errorMessage <String>] [--nodePath <String>] [--outputId <UUID>] [--startedAt <Datetime>] [--status <String>]
csdk database-function-graph-execution-node-state update --id <UUID> [--callbackInputs <JSON>] [--callbackMeta <JSON>] [--callbackTokenHash <String>] [--completedAt <Datetime>] [--databaseId <UUID>] [--errorCode <String>] [--errorMessage <String>] [--executionId <UUID>] [--nodeName <String>] [--nodePath <String>] [--outputId <UUID>] [--startedAt <Datetime>] [--status <String>]
csdk database-function-graph-execution-node-state delete --id <UUID>
```

## Examples

### List databaseFunctionGraphExecutionNodeState records

```bash
csdk database-function-graph-execution-node-state list
```

### List databaseFunctionGraphExecutionNodeState records with pagination

```bash
csdk database-function-graph-execution-node-state list --limit 10 --offset 0
```

### List databaseFunctionGraphExecutionNodeState records with cursor pagination

```bash
csdk database-function-graph-execution-node-state list --limit 10 --after <cursor>
```

### Find first matching databaseFunctionGraphExecutionNodeState

```bash
csdk database-function-graph-execution-node-state find-first --where.id.equalTo <value>
```

### List databaseFunctionGraphExecutionNodeState records with field selection

```bash
csdk database-function-graph-execution-node-state list --select id,id
```

### List databaseFunctionGraphExecutionNodeState records with filtering and ordering

```bash
csdk database-function-graph-execution-node-state list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseFunctionGraphExecutionNodeState

```bash
csdk database-function-graph-execution-node-state create --databaseId <UUID> --executionId <UUID> --nodeName <String> [--callbackInputs <JSON>] [--callbackMeta <JSON>] [--callbackTokenHash <String>] [--completedAt <Datetime>] [--errorCode <String>] [--errorMessage <String>] [--nodePath <String>] [--outputId <UUID>] [--startedAt <Datetime>] [--status <String>]
```

### Get a databaseFunctionGraphExecutionNodeState by id

```bash
csdk database-function-graph-execution-node-state get --id <value>
```
