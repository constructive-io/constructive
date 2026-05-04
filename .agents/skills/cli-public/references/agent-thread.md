# agentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentThread records via csdk CLI

## Usage

```bash
csdk agent-thread list
csdk agent-thread list --where.<field>.<op> <value> --orderBy <values>
csdk agent-thread list --limit 10 --after <cursor>
csdk agent-thread find-first --where.<field>.<op> <value>
csdk agent-thread get --id <UUID>
csdk agent-thread create --entityId <UUID> [--title <String>] [--mode <String>] [--model <String>] [--systemPrompt <String>] [--ownerId <UUID>] [--status <String>]
csdk agent-thread update --id <UUID> [--title <String>] [--mode <String>] [--model <String>] [--systemPrompt <String>] [--ownerId <UUID>] [--entityId <UUID>] [--status <String>]
csdk agent-thread delete --id <UUID>
```

## Examples

### List agentThread records

```bash
csdk agent-thread list
```

### List agentThread records with pagination

```bash
csdk agent-thread list --limit 10 --offset 0
```

### List agentThread records with cursor pagination

```bash
csdk agent-thread list --limit 10 --after <cursor>
```

### Find first matching agentThread

```bash
csdk agent-thread find-first --where.id.equalTo <value>
```

### List agentThread records with field selection

```bash
csdk agent-thread list --select id,id
```

### List agentThread records with filtering and ordering

```bash
csdk agent-thread list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentThread

```bash
csdk agent-thread create --entityId <UUID> [--title <String>] [--mode <String>] [--model <String>] [--systemPrompt <String>] [--ownerId <UUID>] [--status <String>]
```

### Get a agentThread by id

```bash
csdk agent-thread get --id <value>
```
