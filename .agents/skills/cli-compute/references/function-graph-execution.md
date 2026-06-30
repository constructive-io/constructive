# functionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphExecution records via csdk CLI

## Usage

```bash
csdk function-graph-execution list
csdk function-graph-execution list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-execution list --limit 10 --after <cursor>
csdk function-graph-execution find-first --where.<field>.<op> <value>
csdk function-graph-execution get --id <UUID>
csdk function-graph-execution create --graphId <UUID> --databaseId <UUID> --outputNode <String> [--startedAt <Datetime>] [--invocationId <UUID>] [--entityId <UUID>] [--outputPort <String>] [--status <String>] [--inputPayload <JSON>] [--outputPayload <JSON>] [--nodeOutputs <JSON>] [--executionPlan <JSON>] [--currentWave <Int>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--definitionsCommitId <UUID>] [--tickCount <Int>] [--completedAt <Datetime>] [--maxTicks <Int>] [--maxPendingJobs <Int>] [--timeoutAt <Datetime>] [--errorCode <String>] [--errorMessage <String>]
csdk function-graph-execution update --id <UUID> [--startedAt <Datetime>] [--graphId <UUID>] [--invocationId <UUID>] [--databaseId <UUID>] [--entityId <UUID>] [--outputNode <String>] [--outputPort <String>] [--status <String>] [--inputPayload <JSON>] [--outputPayload <JSON>] [--nodeOutputs <JSON>] [--executionPlan <JSON>] [--currentWave <Int>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--definitionsCommitId <UUID>] [--tickCount <Int>] [--completedAt <Datetime>] [--maxTicks <Int>] [--maxPendingJobs <Int>] [--timeoutAt <Datetime>] [--errorCode <String>] [--errorMessage <String>]
csdk function-graph-execution delete --id <UUID>
```

## Examples

### List functionGraphExecution records

```bash
csdk function-graph-execution list
```

### List functionGraphExecution records with pagination

```bash
csdk function-graph-execution list --limit 10 --offset 0
```

### List functionGraphExecution records with cursor pagination

```bash
csdk function-graph-execution list --limit 10 --after <cursor>
```

### Find first matching functionGraphExecution

```bash
csdk function-graph-execution find-first --where.id.equalTo <value>
```

### List functionGraphExecution records with field selection

```bash
csdk function-graph-execution list --select id,id
```

### List functionGraphExecution records with filtering and ordering

```bash
csdk function-graph-execution list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphExecution

```bash
csdk function-graph-execution create --graphId <UUID> --databaseId <UUID> --outputNode <String> [--startedAt <Datetime>] [--invocationId <UUID>] [--entityId <UUID>] [--outputPort <String>] [--status <String>] [--inputPayload <JSON>] [--outputPayload <JSON>] [--nodeOutputs <JSON>] [--executionPlan <JSON>] [--currentWave <Int>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--definitionsCommitId <UUID>] [--tickCount <Int>] [--completedAt <Datetime>] [--maxTicks <Int>] [--maxPendingJobs <Int>] [--timeoutAt <Datetime>] [--errorCode <String>] [--errorMessage <String>]
```

### Get a functionGraphExecution by id

```bash
csdk function-graph-execution get --id <value>
```
