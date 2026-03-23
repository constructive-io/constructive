# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AuditLog records via csdk CLI

## Usage

```bash
csdk audit-log list
csdk audit-log get --id <UUID>
csdk audit-log create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
csdk audit-log update --id <UUID> [--event <String>] [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>] [--success <Boolean>]
csdk audit-log delete --id <UUID>
```

## Examples

### List all auditLog records

```bash
csdk audit-log list
```

### Create a auditLog

```bash
csdk audit-log create --event <String> --success <Boolean> [--actorId <UUID>] [--origin <Origin>] [--userAgent <String>] [--ipAddress <InternetAddress>]
```

### Get a auditLog by id

```bash
csdk audit-log get --id <value>
```
