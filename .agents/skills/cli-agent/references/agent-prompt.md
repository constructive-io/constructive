# agentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentPrompt records via csdk CLI

## Usage

```bash
csdk agent-prompt list
csdk agent-prompt list --where.<field>.<op> <value> --orderBy <values>
csdk agent-prompt list --limit 10 --after <cursor>
csdk agent-prompt find-first --where.<field>.<op> <value>
csdk agent-prompt get --id <UUID>
csdk agent-prompt create --content <String> --databaseId <UUID> --name <String> [--createdBy <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--updatedBy <UUID>]
csdk agent-prompt update --id <UUID> [--content <String>] [--createdBy <UUID>] [--databaseId <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--name <String>] [--updatedBy <UUID>]
csdk agent-prompt delete --id <UUID>
```

## Examples

### List agentPrompt records

```bash
csdk agent-prompt list
```

### List agentPrompt records with pagination

```bash
csdk agent-prompt list --limit 10 --offset 0
```

### List agentPrompt records with cursor pagination

```bash
csdk agent-prompt list --limit 10 --after <cursor>
```

### Find first matching agentPrompt

```bash
csdk agent-prompt find-first --where.id.equalTo <value>
```

### List agentPrompt records with field selection

```bash
csdk agent-prompt list --select id,id
```

### List agentPrompt records with filtering and ordering

```bash
csdk agent-prompt list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentPrompt

```bash
csdk agent-prompt create --content <String> --databaseId <UUID> --name <String> [--createdBy <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--updatedBy <UUID>]
```

### Get a agentPrompt by id

```bash
csdk agent-prompt get --id <value>
```
