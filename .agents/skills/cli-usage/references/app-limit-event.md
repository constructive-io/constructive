# appLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitEvent records via csdk CLI

## Usage

```bash
csdk app-limit-event list
csdk app-limit-event list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-event list --limit 10 --after <cursor>
csdk app-limit-event find-first --where.<field>.<op> <value>
csdk app-limit-event get --id <UUID>
csdk app-limit-event create [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
csdk app-limit-event update --id <UUID> [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
csdk app-limit-event delete --id <UUID>
```

## Examples

### List appLimitEvent records

```bash
csdk app-limit-event list
```

### List appLimitEvent records with pagination

```bash
csdk app-limit-event list --limit 10 --offset 0
```

### List appLimitEvent records with cursor pagination

```bash
csdk app-limit-event list --limit 10 --after <cursor>
```

### Find first matching appLimitEvent

```bash
csdk app-limit-event find-first --where.id.equalTo <value>
```

### List appLimitEvent records with field selection

```bash
csdk app-limit-event list --select id,id
```

### List appLimitEvent records with filtering and ordering

```bash
csdk app-limit-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitEvent

```bash
csdk app-limit-event create [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
```

### Get a appLimitEvent by id

```bash
csdk app-limit-event get --id <value>
```
