# databaseFunctionGraphExecution

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseFunctionGraphExecution records via csdk CLI

## Usage

```bash
csdk database-function-graph-execution list
csdk database-function-graph-execution list --where.<field>.<op> <value> --orderBy <values>
csdk database-function-graph-execution list --limit 10 --after <cursor>
csdk database-function-graph-execution find-first --where.<field>.<op> <value>
csdk database-function-graph-execution get --id <UUID>
csdk database-function-graph-execution create --databaseId <UUID> --graphId <UUID> [--actorId <UUID>] [--completedAt <Datetime>] [--currentWave <Int>] [--definitionsCommitId <UUID>] [--entityId <UUID>] [--entityType <String>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--inputPayload <JSON>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--organizationId <UUID>] [--outputNames <String>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentInvocationId <UUID>] [--parentNodeName <String>] [--principalId <UUID>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
csdk database-function-graph-execution update --id <UUID> [--actorId <UUID>] [--completedAt <Datetime>] [--currentWave <Int>] [--databaseId <UUID>] [--definitionsCommitId <UUID>] [--entityId <UUID>] [--entityType <String>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--graphId <UUID>] [--inputPayload <JSON>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--organizationId <UUID>] [--outputNames <String>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentInvocationId <UUID>] [--parentNodeName <String>] [--principalId <UUID>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
csdk database-function-graph-execution delete --id <UUID>
```

## Examples

### List databaseFunctionGraphExecution records

```bash
csdk database-function-graph-execution list
```

### List databaseFunctionGraphExecution records with pagination

```bash
csdk database-function-graph-execution list --limit 10 --offset 0
```

### List databaseFunctionGraphExecution records with cursor pagination

```bash
csdk database-function-graph-execution list --limit 10 --after <cursor>
```

### Find first matching databaseFunctionGraphExecution

```bash
csdk database-function-graph-execution find-first --where.id.equalTo <value>
```

### List databaseFunctionGraphExecution records with field selection

```bash
csdk database-function-graph-execution list --select id,id
```

### List databaseFunctionGraphExecution records with filtering and ordering

```bash
csdk database-function-graph-execution list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseFunctionGraphExecution

```bash
csdk database-function-graph-execution create --databaseId <UUID> --graphId <UUID> [--actorId <UUID>] [--completedAt <Datetime>] [--currentWave <Int>] [--definitionsCommitId <UUID>] [--entityId <UUID>] [--entityType <String>] [--errorCode <String>] [--errorMessage <String>] [--executionPlan <JSON>] [--inputPayload <JSON>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--lastProgressAt <Datetime>] [--maxPendingJobs <Int>] [--maxTicks <Int>] [--nodeOutputs <JSON>] [--organizationId <UUID>] [--outputNames <String>] [--outputNode <String>] [--outputPayload <JSON>] [--outputPort <String>] [--parentExecutionId <UUID>] [--parentInvocationId <UUID>] [--parentNodeName <String>] [--principalId <UUID>] [--startedAt <Datetime>] [--status <String>] [--tickCount <Int>] [--timeoutAt <Datetime>]
```

### Get a databaseFunctionGraphExecution by id

```bash
csdk database-function-graph-execution get --id <value>
```
