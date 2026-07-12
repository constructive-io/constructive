# resourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceStatusCheck records via csdk CLI

## Usage

```bash
csdk resource-status-check list
csdk resource-status-check list --where.<field>.<op> <value> --orderBy <values>
csdk resource-status-check list --limit 10 --after <cursor>
csdk resource-status-check find-first --where.<field>.<op> <value>
csdk resource-status-check get --id <UUID>
csdk resource-status-check create --resourceId <UUID> --databaseId <UUID> [--requestedBy <UUID>] [--requestedAt <Datetime>] [--completedAt <Datetime>] [--status <String>] [--result <JSON>]
csdk resource-status-check update --id <UUID> [--resourceId <UUID>] [--databaseId <UUID>] [--requestedBy <UUID>] [--requestedAt <Datetime>] [--completedAt <Datetime>] [--status <String>] [--result <JSON>]
csdk resource-status-check delete --id <UUID>
```

## Examples

### List resourceStatusCheck records

```bash
csdk resource-status-check list
```

### List resourceStatusCheck records with pagination

```bash
csdk resource-status-check list --limit 10 --offset 0
```

### List resourceStatusCheck records with cursor pagination

```bash
csdk resource-status-check list --limit 10 --after <cursor>
```

### Find first matching resourceStatusCheck

```bash
csdk resource-status-check find-first --where.id.equalTo <value>
```

### List resourceStatusCheck records with field selection

```bash
csdk resource-status-check list --select id,id
```

### List resourceStatusCheck records with filtering and ordering

```bash
csdk resource-status-check list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceStatusCheck

```bash
csdk resource-status-check create --resourceId <UUID> --databaseId <UUID> [--requestedBy <UUID>] [--requestedAt <Datetime>] [--completedAt <Datetime>] [--status <String>] [--result <JSON>]
```

### Get a resourceStatusCheck by id

```bash
csdk resource-status-check get --id <value>
```
