# platformAgentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentRunWorkspace records via csdk CLI

## Usage

```bash
csdk platform-agent-run-workspace list
csdk platform-agent-run-workspace list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-run-workspace list --limit 10 --after <cursor>
csdk platform-agent-run-workspace find-first --where.<field>.<op> <value>
csdk platform-agent-run-workspace get --id <UUID>
csdk platform-agent-run-workspace create --baseBranch <String> --branch <String> --provider <String> --repo <String> --runId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--baseCommit <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--publication <String>] [--repositoryId <UUID>] [--state <String>] [--visibility <String>]
csdk platform-agent-run-workspace update --id <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--baseBranch <String>] [--baseCommit <String>] [--branch <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--provider <String>] [--publication <String>] [--repo <String>] [--repositoryId <UUID>] [--runId <UUID>] [--state <String>] [--visibility <String>]
csdk platform-agent-run-workspace delete --id <UUID>
```

## Examples

### List platformAgentRunWorkspace records

```bash
csdk platform-agent-run-workspace list
```

### List platformAgentRunWorkspace records with pagination

```bash
csdk platform-agent-run-workspace list --limit 10 --offset 0
```

### List platformAgentRunWorkspace records with cursor pagination

```bash
csdk platform-agent-run-workspace list --limit 10 --after <cursor>
```

### Find first matching platformAgentRunWorkspace

```bash
csdk platform-agent-run-workspace find-first --where.id.equalTo <value>
```

### List platformAgentRunWorkspace records with field selection

```bash
csdk platform-agent-run-workspace list --select id,id
```

### List platformAgentRunWorkspace records with filtering and ordering

```bash
csdk platform-agent-run-workspace list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentRunWorkspace

```bash
csdk platform-agent-run-workspace create --baseBranch <String> --branch <String> --provider <String> --repo <String> --runId <UUID> [--actorId <UUID>] [--artifacts <JSON>] [--baseCommit <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--publication <String>] [--repositoryId <UUID>] [--state <String>] [--visibility <String>]
```

### Get a platformAgentRunWorkspace by id

```bash
csdk platform-agent-run-workspace get --id <value>
```
