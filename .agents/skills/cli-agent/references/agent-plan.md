# agentPlan

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentPlan records via csdk CLI

## Usage

```bash
csdk agent-plan list
csdk agent-plan list --where.<field>.<op> <value> --orderBy <values>
csdk agent-plan list --limit 10 --after <cursor>
csdk agent-plan find-first --where.<field>.<op> <value>
csdk agent-plan get --id <UUID>
csdk agent-plan create --threadId <UUID> --databaseId <UUID> --title <String> [--ownerId <UUID>] [--description <String>] [--status <String>]
csdk agent-plan update --id <UUID> [--ownerId <UUID>] [--threadId <UUID>] [--databaseId <UUID>] [--title <String>] [--description <String>] [--status <String>]
csdk agent-plan delete --id <UUID>
```

## Examples

### List agentPlan records

```bash
csdk agent-plan list
```

### List agentPlan records with pagination

```bash
csdk agent-plan list --limit 10 --offset 0
```

### List agentPlan records with cursor pagination

```bash
csdk agent-plan list --limit 10 --after <cursor>
```

### Find first matching agentPlan

```bash
csdk agent-plan find-first --where.id.equalTo <value>
```

### List agentPlan records with field selection

```bash
csdk agent-plan list --select id,id
```

### List agentPlan records with filtering and ordering

```bash
csdk agent-plan list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentPlan

```bash
csdk agent-plan create --threadId <UUID> --databaseId <UUID> --title <String> [--ownerId <UUID>] [--description <String>] [--status <String>]
```

### Get a agentPlan by id

```bash
csdk agent-plan get --id <value>
```
