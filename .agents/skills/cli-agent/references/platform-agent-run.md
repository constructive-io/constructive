# platformAgentRun

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentRun records via csdk CLI

## Usage

```bash
csdk platform-agent-run list
csdk platform-agent-run list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-run list --limit 10 --after <cursor>
csdk platform-agent-run find-first --where.<field>.<op> <value>
csdk platform-agent-run get --id <UUID>
csdk platform-agent-run create --threadId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--databaseId <UUID>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--tokenUsage <JSON>] [--totalCost <BigFloat>] [--visibility <String>]
csdk platform-agent-run update --id <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--databaseId <UUID>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--threadId <UUID>] [--tokenUsage <JSON>] [--totalCost <BigFloat>] [--visibility <String>]
csdk platform-agent-run delete --id <UUID>
```

## Examples

### List platformAgentRun records

```bash
csdk platform-agent-run list
```

### List platformAgentRun records with pagination

```bash
csdk platform-agent-run list --limit 10 --offset 0
```

### List platformAgentRun records with cursor pagination

```bash
csdk platform-agent-run list --limit 10 --after <cursor>
```

### Find first matching platformAgentRun

```bash
csdk platform-agent-run find-first --where.id.equalTo <value>
```

### List platformAgentRun records with field selection

```bash
csdk platform-agent-run list --select id,id
```

### List platformAgentRun records with filtering and ordering

```bash
csdk platform-agent-run list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentRun

```bash
csdk platform-agent-run create --threadId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--attempt <Int>] [--baseCommit <String>] [--branch <String>] [--databaseId <UUID>] [--deadlineAt <Datetime>] [--entityId <UUID>] [--error <String>] [--executionId <UUID>] [--finishedAt <Datetime>] [--headCommit <String>] [--lastEventSeq <Int>] [--parentRunId <UUID>] [--placement <String>] [--principalId <UUID>] [--repoUrl <String>] [--startedAt <Datetime>] [--status <String>] [--tokenUsage <JSON>] [--totalCost <BigFloat>] [--visibility <String>]
```

### Get a platformAgentRun by id

```bash
csdk platform-agent-run get --id <value>
```
