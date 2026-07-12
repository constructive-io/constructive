# platformResourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceEvent records via csdk CLI

## Usage

```bash
csdk platform-resource-event list
csdk platform-resource-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-event list --limit 10 --after <cursor>
csdk platform-resource-event find-first --where.<field>.<op> <value>
csdk platform-resource-event get --id <UUID>
csdk platform-resource-event create --resourceId <UUID> --eventType <String> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-resource-event update --id <UUID> [--resourceId <UUID>] [--eventType <String>] [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-resource-event delete --id <UUID>
```

## Examples

### List platformResourceEvent records

```bash
csdk platform-resource-event list
```

### List platformResourceEvent records with pagination

```bash
csdk platform-resource-event list --limit 10 --offset 0
```

### List platformResourceEvent records with cursor pagination

```bash
csdk platform-resource-event list --limit 10 --after <cursor>
```

### Find first matching platformResourceEvent

```bash
csdk platform-resource-event find-first --where.id.equalTo <value>
```

### List platformResourceEvent records with field selection

```bash
csdk platform-resource-event list --select id,id
```

### List platformResourceEvent records with filtering and ordering

```bash
csdk platform-resource-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceEvent

```bash
csdk platform-resource-event create --resourceId <UUID> --eventType <String> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a platformResourceEvent by id

```bash
csdk platform-resource-event get --id <value>
```
