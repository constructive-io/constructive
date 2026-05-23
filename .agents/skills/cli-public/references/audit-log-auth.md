# auditLogAuth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AuditLogAuth records via csdk CLI

## Usage

```bash
csdk audit-log-auth list
csdk audit-log-auth list --where.<field>.<op> <value> --orderBy <values>
csdk audit-log-auth list --limit 10 --after <cursor>
csdk audit-log-auth find-first --where.<field>.<op> <value>
csdk audit-log-auth get --id <UUID>
csdk audit-log-auth create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
csdk audit-log-auth update --id <UUID> [--event <String>] [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>] [--success <Boolean>]
csdk audit-log-auth delete --id <UUID>
```

## Examples

### List auditLogAuth records

```bash
csdk audit-log-auth list
```

### List auditLogAuth records with pagination

```bash
csdk audit-log-auth list --limit 10 --offset 0
```

### List auditLogAuth records with cursor pagination

```bash
csdk audit-log-auth list --limit 10 --after <cursor>
```

### Find first matching auditLogAuth

```bash
csdk audit-log-auth find-first --where.id.equalTo <value>
```

### List auditLogAuth records with field selection

```bash
csdk audit-log-auth list --select id,id
```

### List auditLogAuth records with filtering and ordering

```bash
csdk audit-log-auth list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a auditLogAuth

```bash
csdk audit-log-auth create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
```

### Get a auditLogAuth by id

```bash
csdk audit-log-auth get --id <value>
```
