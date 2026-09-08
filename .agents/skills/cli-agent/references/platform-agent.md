# platformAgent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgent records via csdk CLI

## Usage

```bash
csdk platform-agent list
csdk platform-agent list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent list --limit 10 --after <cursor>
csdk platform-agent find-first --where.<field>.<op> <value>
csdk platform-agent get --id <UUID>
csdk platform-agent create --name <String> [--config <JSON>] [--isEphemeral <Boolean>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
csdk platform-agent update --id <UUID> [--config <JSON>] [--isEphemeral <Boolean>] [--name <String>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
csdk platform-agent delete --id <UUID>
```

## Examples

### List platformAgent records

```bash
csdk platform-agent list
```

### List platformAgent records with pagination

```bash
csdk platform-agent list --limit 10 --offset 0
```

### List platformAgent records with cursor pagination

```bash
csdk platform-agent list --limit 10 --after <cursor>
```

### Find first matching platformAgent

```bash
csdk platform-agent find-first --where.id.equalTo <value>
```

### List platformAgent records with field selection

```bash
csdk platform-agent list --select id,id
```

### List platformAgent records with filtering and ordering

```bash
csdk platform-agent list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgent

```bash
csdk platform-agent create --name <String> [--config <JSON>] [--isEphemeral <Boolean>] [--ownerId <UUID>] [--parentId <UUID>] [--personaId <UUID>] [--status <String>] [--systemPrompt <String>]
```

### Get a platformAgent by id

```bash
csdk platform-agent get --id <value>
```
