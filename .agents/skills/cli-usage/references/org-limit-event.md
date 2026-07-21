# orgLimitEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimitEvent records via csdk CLI

## Usage

```bash
csdk org-limit-event list
csdk org-limit-event list --where.<field>.<op> <value> --orderBy <values>
csdk org-limit-event list --limit 10 --after <cursor>
csdk org-limit-event find-first --where.<field>.<op> <value>
csdk org-limit-event get --id <UUID>
csdk org-limit-event create [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
csdk org-limit-event update --id <UUID> [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
csdk org-limit-event delete --id <UUID>
```

## Examples

### List orgLimitEvent records

```bash
csdk org-limit-event list
```

### List orgLimitEvent records with pagination

```bash
csdk org-limit-event list --limit 10 --offset 0
```

### List orgLimitEvent records with cursor pagination

```bash
csdk org-limit-event list --limit 10 --after <cursor>
```

### Find first matching orgLimitEvent

```bash
csdk org-limit-event find-first --where.id.equalTo <value>
```

### List orgLimitEvent records with field selection

```bash
csdk org-limit-event list --select id,id
```

### List orgLimitEvent records with filtering and ordering

```bash
csdk org-limit-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgLimitEvent

```bash
csdk org-limit-event create [--actorId <UUID>] [--delta <BigInt>] [--entityId <UUID>] [--entityType <String>] [--eventType <String>] [--maxAtEvent <BigInt>] [--name <String>] [--numAfter <BigInt>] [--numBefore <BigInt>] [--organizationId <UUID>] [--reason <String>]
```

### Get a orgLimitEvent by id

```bash
csdk org-limit-event get --id <value>
```
