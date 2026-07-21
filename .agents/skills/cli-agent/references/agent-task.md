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
csdk agent-task create --databaseId <UUID> --description <String> --planId <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--error <String>] [--orderIndex <Int>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>]
csdk agent-task update --id <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--databaseId <UUID>] [--description <String>] [--error <String>] [--orderIndex <Int>] [--planId <UUID>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>]
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
csdk agent-task create --databaseId <UUID> --description <String> --planId <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--error <String>] [--orderIndex <Int>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>]
```

### Get a agentTask by id

```bash
csdk agent-task get --id <value>
```
