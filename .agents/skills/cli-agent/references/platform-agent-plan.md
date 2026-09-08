# platformAgentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentPlan records via csdk CLI

## Usage

```bash
csdk platform-agent-plan list
csdk platform-agent-plan list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-plan list --limit 10 --after <cursor>
csdk platform-agent-plan find-first --where.<field>.<op> <value>
csdk platform-agent-plan get --id <UUID>
csdk platform-agent-plan create --threadId <UUID> --title <String> [--description <String>] [--ownerId <UUID>] [--status <String>] [--visibility <String>]
csdk platform-agent-plan update --id <UUID> [--description <String>] [--ownerId <UUID>] [--status <String>] [--threadId <UUID>] [--title <String>] [--visibility <String>]
csdk platform-agent-plan delete --id <UUID>
```

## Examples

### List platformAgentPlan records

```bash
csdk platform-agent-plan list
```

### List platformAgentPlan records with pagination

```bash
csdk platform-agent-plan list --limit 10 --offset 0
```

### List platformAgentPlan records with cursor pagination

```bash
csdk platform-agent-plan list --limit 10 --after <cursor>
```

### Find first matching platformAgentPlan

```bash
csdk platform-agent-plan find-first --where.id.equalTo <value>
```

### List platformAgentPlan records with field selection

```bash
csdk platform-agent-plan list --select id,id
```

### List platformAgentPlan records with filtering and ordering

```bash
csdk platform-agent-plan list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentPlan

```bash
csdk platform-agent-plan create --threadId <UUID> --title <String> [--description <String>] [--ownerId <UUID>] [--status <String>] [--visibility <String>]
```

### Get a platformAgentPlan by id

```bash
csdk platform-agent-plan get --id <value>
```
