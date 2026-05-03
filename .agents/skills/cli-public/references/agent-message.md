# agentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentMessage records via csdk CLI

## Usage

```bash
csdk agent-message list
csdk agent-message list --where.<field>.<op> <value> --orderBy <values>
csdk agent-message list --limit 10 --after <cursor>
csdk agent-message find-first --where.<field>.<op> <value>
csdk agent-message get --id <UUID>
csdk agent-message create --threadId <UUID> --entityId <UUID> --authorRole <String> [--ownerId <UUID>] [--parts <JSON>]
csdk agent-message update --id <UUID> [--threadId <UUID>] [--entityId <UUID>] [--authorRole <String>] [--ownerId <UUID>] [--parts <JSON>]
csdk agent-message delete --id <UUID>
```

## Examples

### List agentMessage records

```bash
csdk agent-message list
```

### List agentMessage records with pagination

```bash
csdk agent-message list --limit 10 --offset 0
```

### List agentMessage records with cursor pagination

```bash
csdk agent-message list --limit 10 --after <cursor>
```

### Find first matching agentMessage

```bash
csdk agent-message find-first --where.id.equalTo <value>
```

### List agentMessage records with field selection

```bash
csdk agent-message list --select id,id
```

### List agentMessage records with filtering and ordering

```bash
csdk agent-message list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentMessage

```bash
csdk agent-message create --threadId <UUID> --entityId <UUID> --authorRole <String> [--ownerId <UUID>] [--parts <JSON>]
```

### Get a agentMessage by id

```bash
csdk agent-message get --id <value>
```
