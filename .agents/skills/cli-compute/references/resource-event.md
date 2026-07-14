# resourceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceEvent records via csdk CLI

## Usage

```bash
csdk resource-event list
csdk resource-event list --where.<field>.<op> <value> --orderBy <values>
csdk resource-event list --limit 10 --after <cursor>
csdk resource-event find-first --where.<field>.<op> <value>
csdk resource-event get --id <UUID>
csdk resource-event create --databaseId <UUID> --eventType <String> --resourceId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk resource-event update --id <UUID> [--actorId <UUID>] [--databaseId <UUID>] [--eventType <String>] [--message <String>] [--metadata <JSON>] [--resourceId <UUID>]
csdk resource-event delete --id <UUID>
```

## Examples

### List resourceEvent records

```bash
csdk resource-event list
```

### List resourceEvent records with pagination

```bash
csdk resource-event list --limit 10 --offset 0
```

### List resourceEvent records with cursor pagination

```bash
csdk resource-event list --limit 10 --after <cursor>
```

### Find first matching resourceEvent

```bash
csdk resource-event find-first --where.id.equalTo <value>
```

### List resourceEvent records with field selection

```bash
csdk resource-event list --select id,id
```

### List resourceEvent records with filtering and ordering

```bash
csdk resource-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceEvent

```bash
csdk resource-event create --databaseId <UUID> --eventType <String> --resourceId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a resourceEvent by id

```bash
csdk resource-event get --id <value>
```
