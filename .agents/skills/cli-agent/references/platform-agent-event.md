# platformAgentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentEvent records via csdk CLI

## Usage

```bash
csdk platform-agent-event list
csdk platform-agent-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-event list --limit 10 --after <cursor>
csdk platform-agent-event find-first --where.<field>.<op> <value>
csdk platform-agent-event get --id <UUID>
csdk platform-agent-event create --entry <JSON> --recordedAt <Datetime> --runId <UUID> --seq <Int> --transcriptVersion <Int> [--actorId <UUID>] [--transcriptFormat <String>] [--visibility <String>]
csdk platform-agent-event update --id <UUID> [--actorId <UUID>] [--entry <JSON>] [--recordedAt <Datetime>] [--runId <UUID>] [--seq <Int>] [--transcriptFormat <String>] [--transcriptVersion <Int>] [--visibility <String>]
csdk platform-agent-event delete --id <UUID>
```

## Examples

### List platformAgentEvent records

```bash
csdk platform-agent-event list
```

### List platformAgentEvent records with pagination

```bash
csdk platform-agent-event list --limit 10 --offset 0
```

### List platformAgentEvent records with cursor pagination

```bash
csdk platform-agent-event list --limit 10 --after <cursor>
```

### Find first matching platformAgentEvent

```bash
csdk platform-agent-event find-first --where.id.equalTo <value>
```

### List platformAgentEvent records with field selection

```bash
csdk platform-agent-event list --select id,id
```

### List platformAgentEvent records with filtering and ordering

```bash
csdk platform-agent-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentEvent

```bash
csdk platform-agent-event create --entry <JSON> --recordedAt <Datetime> --runId <UUID> --seq <Int> --transcriptVersion <Int> [--actorId <UUID>] [--transcriptFormat <String>] [--visibility <String>]
```

### Get a platformAgentEvent by id

```bash
csdk platform-agent-event get --id <value>
```
