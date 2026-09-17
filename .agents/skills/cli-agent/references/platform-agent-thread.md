# platformAgentThread

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentThread records via csdk CLI

## Usage

```bash
csdk platform-agent-thread list
csdk platform-agent-thread list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-thread list --limit 10 --after <cursor>
csdk platform-agent-thread find-first --where.<field>.<op> <value>
csdk platform-agent-thread get --id <UUID>
csdk platform-agent-thread create [--agentId <UUID>] [--archivedAt <Datetime>] [--isArchived <Boolean>] [--mode <String>] [--model <String>] [--ownerId <UUID>] [--parentThreadId <UUID>] [--promptTemplateId <UUID>] [--status <String>] [--systemPrompt <String>] [--tags <String>] [--title <String>] [--visibility <String>]
csdk platform-agent-thread update --id <UUID> [--agentId <UUID>] [--archivedAt <Datetime>] [--isArchived <Boolean>] [--mode <String>] [--model <String>] [--ownerId <UUID>] [--parentThreadId <UUID>] [--promptTemplateId <UUID>] [--status <String>] [--systemPrompt <String>] [--tags <String>] [--title <String>] [--visibility <String>]
csdk platform-agent-thread delete --id <UUID>
```

## Examples

### List platformAgentThread records

```bash
csdk platform-agent-thread list
```

### List platformAgentThread records with pagination

```bash
csdk platform-agent-thread list --limit 10 --offset 0
```

### List platformAgentThread records with cursor pagination

```bash
csdk platform-agent-thread list --limit 10 --after <cursor>
```

### Find first matching platformAgentThread

```bash
csdk platform-agent-thread find-first --where.id.equalTo <value>
```

### List platformAgentThread records with field selection

```bash
csdk platform-agent-thread list --select id,id
```

### List platformAgentThread records with filtering and ordering

```bash
csdk platform-agent-thread list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentThread

```bash
csdk platform-agent-thread create [--agentId <UUID>] [--archivedAt <Datetime>] [--isArchived <Boolean>] [--mode <String>] [--model <String>] [--ownerId <UUID>] [--parentThreadId <UUID>] [--promptTemplateId <UUID>] [--status <String>] [--systemPrompt <String>] [--tags <String>] [--title <String>] [--visibility <String>]
```

### Get a platformAgentThread by id

```bash
csdk platform-agent-thread get --id <value>
```
