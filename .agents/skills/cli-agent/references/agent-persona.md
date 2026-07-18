# agentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentPersona records via csdk CLI

## Usage

```bash
csdk agent-persona list
csdk agent-persona list --where.<field>.<op> <value> --orderBy <values>
csdk agent-persona list --limit 10 --after <cursor>
csdk agent-persona find-first --where.<field>.<op> <value>
csdk agent-persona get --id <UUID>
csdk agent-persona create --databaseId <UUID> --name <String> --slug <String> [--config <JSON>] [--createdBy <UUID>] [--description <String>] [--isActive <Boolean>] [--resources <String>] [--systemPrompt <String>] [--updatedBy <UUID>]
csdk agent-persona update --id <UUID> [--config <JSON>] [--createdBy <UUID>] [--databaseId <UUID>] [--description <String>] [--isActive <Boolean>] [--name <String>] [--resources <String>] [--slug <String>] [--systemPrompt <String>] [--updatedBy <UUID>]
csdk agent-persona delete --id <UUID>
```

## Examples

### List agentPersona records

```bash
csdk agent-persona list
```

### List agentPersona records with pagination

```bash
csdk agent-persona list --limit 10 --offset 0
```

### List agentPersona records with cursor pagination

```bash
csdk agent-persona list --limit 10 --after <cursor>
```

### Find first matching agentPersona

```bash
csdk agent-persona find-first --where.id.equalTo <value>
```

### List agentPersona records with field selection

```bash
csdk agent-persona list --select id,id
```

### List agentPersona records with filtering and ordering

```bash
csdk agent-persona list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentPersona

```bash
csdk agent-persona create --databaseId <UUID> --name <String> --slug <String> [--config <JSON>] [--createdBy <UUID>] [--description <String>] [--isActive <Boolean>] [--resources <String>] [--systemPrompt <String>] [--updatedBy <UUID>]
```

### Get a agentPersona by id

```bash
csdk agent-persona get --id <value>
```
