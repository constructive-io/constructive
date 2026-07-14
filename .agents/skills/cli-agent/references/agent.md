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
csdk agent create --databaseId <UUID> --name <String> [--config <JSON>] [--isEphemeral <Boolean>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
csdk agent update --id <UUID> [--config <JSON>] [--databaseId <UUID>] [--isEphemeral <Boolean>] [--name <String>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
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
csdk agent create --databaseId <UUID> --name <String> [--config <JSON>] [--isEphemeral <Boolean>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
```

### Get a agent by id

```bash
csdk agent get --id <value>
```
