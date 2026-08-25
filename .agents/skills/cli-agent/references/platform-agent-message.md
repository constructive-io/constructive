# platformAgentMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentMessage records via csdk CLI

## Usage

```bash
csdk platform-agent-message list
csdk platform-agent-message list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-message list --limit 10 --after <cursor>
csdk platform-agent-message find-first --where.<field>.<op> <value>
csdk platform-agent-message get --id <UUID>
csdk platform-agent-message create --authorRole <String> --threadId <UUID> [--actorId <UUID>] [--agentId <UUID>] [--deliveredRunId <UUID>] [--kind <String>] [--model <String>] [--parts <JSON>] [--visibility <String>]
csdk platform-agent-message update --id <UUID> [--actorId <UUID>] [--agentId <UUID>] [--authorRole <String>] [--deliveredRunId <UUID>] [--kind <String>] [--model <String>] [--parts <JSON>] [--threadId <UUID>] [--visibility <String>]
csdk platform-agent-message delete --id <UUID>
```

## Examples

### List platformAgentMessage records

```bash
csdk platform-agent-message list
```

### List platformAgentMessage records with pagination

```bash
csdk platform-agent-message list --limit 10 --offset 0
```

### List platformAgentMessage records with cursor pagination

```bash
csdk platform-agent-message list --limit 10 --after <cursor>
```

### Find first matching platformAgentMessage

```bash
csdk platform-agent-message find-first --where.id.equalTo <value>
```

### List platformAgentMessage records with field selection

```bash
csdk platform-agent-message list --select id,id
```

### List platformAgentMessage records with filtering and ordering

```bash
csdk platform-agent-message list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentMessage

```bash
csdk platform-agent-message create --authorRole <String> --threadId <UUID> [--actorId <UUID>] [--agentId <UUID>] [--deliveredRunId <UUID>] [--kind <String>] [--model <String>] [--parts <JSON>] [--visibility <String>]
```

### Get a platformAgentMessage by id

```bash
csdk platform-agent-message get --id <value>
```
