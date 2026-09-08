# platformAgentTask

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentTask records via csdk CLI

## Usage

```bash
csdk platform-agent-task list
csdk platform-agent-task list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-task list --limit 10 --after <cursor>
csdk platform-agent-task find-first --where.<field>.<op> <value>
csdk platform-agent-task get --id <UUID>
csdk platform-agent-task create --description <String> --planId <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--error <String>] [--orderIndex <Int>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>] [--visibility <String>]
csdk platform-agent-task update --id <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--description <String>] [--error <String>] [--orderIndex <Int>] [--planId <UUID>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>] [--visibility <String>]
csdk platform-agent-task delete --id <UUID>
```

## Examples

### List platformAgentTask records

```bash
csdk platform-agent-task list
```

### List platformAgentTask records with pagination

```bash
csdk platform-agent-task list --limit 10 --offset 0
```

### List platformAgentTask records with cursor pagination

```bash
csdk platform-agent-task list --limit 10 --after <cursor>
```

### Find first matching platformAgentTask

```bash
csdk platform-agent-task find-first --where.id.equalTo <value>
```

### List platformAgentTask records with field selection

```bash
csdk platform-agent-task list --select id,id
```

### List platformAgentTask records with filtering and ordering

```bash
csdk platform-agent-task list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentTask

```bash
csdk platform-agent-task create --description <String> --planId <UUID> [--actorId <UUID>] [--approvalFeedback <String>] [--approvalStatus <String>] [--approvedAt <Datetime>] [--approvedBy <UUID>] [--error <String>] [--orderIndex <Int>] [--requiresApproval <Boolean>] [--source <String>] [--status <String>] [--visibility <String>]
```

### Get a platformAgentTask by id

```bash
csdk platform-agent-task get --id <value>
```
