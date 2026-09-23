# agentRunWorkspace

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentRunWorkspace records via csdk CLI

## Usage

```bash
csdk agent-run-workspace list
csdk agent-run-workspace list --where.<field>.<op> <value> --orderBy <values>
csdk agent-run-workspace list --limit 10 --after <cursor>
csdk agent-run-workspace find-first --where.<field>.<op> <value>
csdk agent-run-workspace get --id <UUID>
csdk agent-run-workspace create --baseBranch <String> --branch <String> --provider <String> --repo <String> --runId <UUID> [--artifacts <JSON>] [--baseCommit <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--publication <String>] [--repositoryId <UUID>] [--state <String>]
csdk agent-run-workspace update --id <UUID> [--artifacts <JSON>] [--baseBranch <String>] [--baseCommit <String>] [--branch <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--provider <String>] [--publication <String>] [--repo <String>] [--repositoryId <UUID>] [--runId <UUID>] [--state <String>]
csdk agent-run-workspace delete --id <UUID>
```

## Examples

### List agentRunWorkspace records

```bash
csdk agent-run-workspace list
```

### List agentRunWorkspace records with pagination

```bash
csdk agent-run-workspace list --limit 10 --offset 0
```

### List agentRunWorkspace records with cursor pagination

```bash
csdk agent-run-workspace list --limit 10 --after <cursor>
```

### Find first matching agentRunWorkspace

```bash
csdk agent-run-workspace find-first --where.id.equalTo <value>
```

### List agentRunWorkspace records with field selection

```bash
csdk agent-run-workspace list --select id,id
```

### List agentRunWorkspace records with filtering and ordering

```bash
csdk agent-run-workspace list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentRunWorkspace

```bash
csdk agent-run-workspace create --baseBranch <String> --branch <String> --provider <String> --repo <String> --runId <UUID> [--artifacts <JSON>] [--baseCommit <String>] [--clonedAt <Datetime>] [--headCommit <String>] [--lastUsedAt <Datetime>] [--ordinal <Int>] [--publication <String>] [--repositoryId <UUID>] [--state <String>]
```

### Get a agentRunWorkspace by id

```bash
csdk agent-run-workspace get --id <value>
```
