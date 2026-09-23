# agentRun

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentRun records via csdk CLI

## Usage

```bash
csdk agent-run list
csdk agent-run list --where.<field>.<op> <value> --orderBy <values>
csdk agent-run list --limit 10 --after <cursor>
csdk agent-run find-first --where.<field>.<op> <value>
csdk agent-run get --id <UUID>
csdk agent-run create --threadId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--tokenUsage <JSON>] [--totalCost <BigFloat>]
csdk agent-run update --id <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--threadId <UUID>] [--tokenUsage <JSON>] [--totalCost <BigFloat>]
csdk agent-run delete --id <UUID>
```

## Examples

### List agentRun records

```bash
csdk agent-run list
```

### List agentRun records with pagination

```bash
csdk agent-run list --limit 10 --offset 0
```

### List agentRun records with cursor pagination

```bash
csdk agent-run list --limit 10 --after <cursor>
```

### Find first matching agentRun

```bash
csdk agent-run find-first --where.id.equalTo <value>
```

### List agentRun records with field selection

```bash
csdk agent-run list --select id,id
```

### List agentRun records with filtering and ordering

```bash
csdk agent-run list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentRun

```bash
csdk agent-run create --threadId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--tokenUsage <JSON>] [--totalCost <BigFloat>]
```

### Get a agentRun by id

```bash
csdk agent-run get --id <value>
```
