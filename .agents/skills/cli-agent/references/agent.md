# agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Agent records via csdk CLI

## Usage

```bash
csdk agent list
csdk agent list --where.<field>.<op> <value> --orderBy <values>
csdk agent list --limit 10 --after <cursor>
csdk agent find-first --where.<field>.<op> <value>
csdk agent get --id <UUID>
csdk agent create --databaseId <UUID> --name <String> [--ownerId <UUID>] [--personaId <UUID>] [--parentId <UUID>] [--systemPrompt <String>] [--config <JSON>] [--status <String>] [--isEphemeral <Boolean>]
csdk agent update --id <UUID> [--ownerId <UUID>] [--databaseId <UUID>] [--personaId <UUID>] [--parentId <UUID>] [--name <String>] [--systemPrompt <String>] [--config <JSON>] [--status <String>] [--isEphemeral <Boolean>]
csdk agent delete --id <UUID>
```

## Examples

### List agent records

```bash
csdk agent list
```

### List agent records with pagination

```bash
csdk agent list --limit 10 --offset 0
```

### List agent records with cursor pagination

```bash
csdk agent list --limit 10 --after <cursor>
```

### Find first matching agent

```bash
csdk agent find-first --where.id.equalTo <value>
```

### List agent records with field selection

```bash
csdk agent list --select id,id
```

### List agent records with filtering and ordering

```bash
csdk agent list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agent

```bash
csdk agent create --databaseId <UUID> --name <String> [--ownerId <UUID>] [--personaId <UUID>] [--parentId <UUID>] [--systemPrompt <String>] [--config <JSON>] [--status <String>] [--isEphemeral <Boolean>]
```

### Get a agent by id

```bash
csdk agent get --id <value>
```
