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
csdk function-graph-execution create --graphId <UUID> --scopeId <UUID> [--completedAt <Datetime>] [--currentWave <Int>] [--definitionsCommitId <UUID>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--inputPayload <JSON>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
csdk function-graph-execution update --id <UUID> [--completedAt <Datetime>] [--currentWave <Int>] [--definitionsCommitId <UUID>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--graphId <UUID>] [--inputPayload <JSON>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--scopeId <UUID>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
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
csdk function-graph-execution create --graphId <UUID> --scopeId <UUID> [--completedAt <Datetime>] [--currentWave <Int>] [--definitionsCommitId <UUID>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--inputPayload <JSON>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentNodeName <String>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
```

### Get a functionGraphExecution by id

```bash
csdk function-graph-execution get --id <value>
```
