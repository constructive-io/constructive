# agentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentEvent records via csdk CLI

## Usage

```bash
csdk agent-event list
csdk agent-event list --where.<field>.<op> <value> --orderBy <values>
csdk agent-event list --limit 10 --after <cursor>
csdk agent-event find-first --where.<field>.<op> <value>
csdk agent-event get --id <UUID>
csdk agent-event create --entry <JSON> --recordedAt <Datetime> --runId <UUID> --seq <Int> --transcriptVersion <Int> [--transcriptFormat <String>]
csdk agent-event update --id <UUID> [--entry <JSON>] [--recordedAt <Datetime>] [--runId <UUID>] [--seq <Int>] [--transcriptFormat <String>] [--transcriptVersion <Int>]
csdk agent-event delete --id <UUID>
```

## Examples

### List agentEvent records

```bash
csdk agent-event list
```

### List agentEvent records with pagination

```bash
csdk agent-event list --limit 10 --offset 0
```

### List agentEvent records with cursor pagination

```bash
csdk agent-event list --limit 10 --after <cursor>
```

### Find first matching agentEvent

```bash
csdk agent-event find-first --where.id.equalTo <value>
```

### List agentEvent records with field selection

```bash
csdk agent-event list --select id,id
```

### List agentEvent records with filtering and ordering

```bash
csdk agent-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentEvent

```bash
csdk agent-event create --entry <JSON> --recordedAt <Datetime> --runId <UUID> --seq <Int> --transcriptVersion <Int> [--transcriptFormat <String>]
```

### Get a agentEvent by id

```bash
csdk agent-event get --id <value>
```
