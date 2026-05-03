# agentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentTask records via csdk CLI

## Usage

```bash
csdk agent-task list
csdk agent-task list --where.<field>.<op> <value> --orderBy <values>
csdk agent-task list --limit 10 --after <cursor>
csdk agent-task find-first --where.<field>.<op> <value>
csdk agent-task get --id <UUID>
csdk agent-task create --threadId <UUID> --entityId <UUID> --description <String> [--source <String>] [--error <String>] [--ownerId <UUID>] [--status <String>]
csdk agent-task update --id <UUID> [--threadId <UUID>] [--entityId <UUID>] [--description <String>] [--source <String>] [--error <String>] [--ownerId <UUID>] [--status <String>]
csdk agent-task delete --id <UUID>
```

## Examples

### List agentTask records

```bash
csdk agent-task list
```

### List agentTask records with pagination

```bash
csdk agent-task list --limit 10 --offset 0
```

### List agentTask records with cursor pagination

```bash
csdk agent-task list --limit 10 --after <cursor>
```

### Find first matching agentTask

```bash
csdk agent-task find-first --where.id.equalTo <value>
```

### List agentTask records with field selection

```bash
csdk agent-task list --select id,id
```

### List agentTask records with filtering and ordering

```bash
csdk agent-task list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentTask

```bash
csdk agent-task create --threadId <UUID> --entityId <UUID> --description <String> [--source <String>] [--error <String>] [--ownerId <UUID>] [--status <String>]
```

### Get a agentTask by id

```bash
csdk agent-task get --id <value>
```
