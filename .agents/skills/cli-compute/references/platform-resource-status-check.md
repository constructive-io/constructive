# platformResourceStatusCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceStatusCheck records via csdk CLI

## Usage

```bash
csdk platform-resource-status-check list
csdk platform-resource-status-check list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-status-check list --limit 10 --after <cursor>
csdk platform-resource-status-check find-first --where.<field>.<op> <value>
csdk platform-resource-status-check get --id <UUID>
csdk platform-resource-status-check create --resourceId <UUID> [--completedAt <Datetime>] [--requestedAt <Datetime>] [--requestedBy <UUID>] [--result <JSON>] [--status <String>]
csdk platform-resource-status-check update --id <UUID> [--completedAt <Datetime>] [--requestedAt <Datetime>] [--requestedBy <UUID>] [--resourceId <UUID>] [--result <JSON>] [--status <String>]
csdk platform-resource-status-check delete --id <UUID>
```

## Examples

### List platformResourceStatusCheck records

```bash
csdk platform-resource-status-check list
```

### List platformResourceStatusCheck records with pagination

```bash
csdk platform-resource-status-check list --limit 10 --offset 0
```

### List platformResourceStatusCheck records with cursor pagination

```bash
csdk platform-resource-status-check list --limit 10 --after <cursor>
```

### Find first matching platformResourceStatusCheck

```bash
csdk platform-resource-status-check find-first --where.id.equalTo <value>
```

### List platformResourceStatusCheck records with field selection

```bash
csdk platform-resource-status-check list --select id,id
```

### List platformResourceStatusCheck records with filtering and ordering

```bash
csdk platform-resource-status-check list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceStatusCheck

```bash
csdk platform-resource-status-check create --resourceId <UUID> [--completedAt <Datetime>] [--requestedAt <Datetime>] [--requestedBy <UUID>] [--result <JSON>] [--status <String>]
```

### Get a platformResourceStatusCheck by id

```bash
csdk platform-resource-status-check get --id <value>
```
