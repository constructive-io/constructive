# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AuditLog records via csdk CLI

## Usage

```bash
csdk audit-log list
csdk audit-log list --where.<field>.<op> <value> --orderBy <values>
csdk audit-log list --limit 10 --after <cursor>
csdk audit-log find-first --where.<field>.<op> <value>
csdk audit-log get --id <UUID>
csdk audit-log create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
csdk audit-log update --id <UUID> [--event <String>] [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>] [--success <Boolean>]
csdk audit-log delete --id <UUID>
```

## Examples

### List auditLog records

```bash
csdk audit-log list
```

### List auditLog records with pagination

```bash
csdk audit-log list --limit 10 --offset 0
```

### List auditLog records with cursor pagination

```bash
csdk audit-log list --limit 10 --after <cursor>
```

### Find first matching auditLog

```bash
csdk audit-log find-first --where.id.equalTo <value>
```

### List auditLog records with field selection

```bash
csdk audit-log list --select id,id
```

### List auditLog records with filtering and ordering

```bash
csdk audit-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a auditLog

```bash
csdk audit-log create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
```

### Get a auditLog by id

```bash
csdk audit-log get --id <value>
```
