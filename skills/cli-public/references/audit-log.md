# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AuditLog records via csdk CLI

## Usage

```bash
csdk audit-log list
csdk audit-log get --id <value>
csdk audit-log create --event <value> --success <value> --userAgentTrgmSimilarity <value> --searchScore <value> [--actorId <value>] [--origin <value>] [--userAgent <value>] [--ipAddress <value>]
csdk audit-log update --id <value> [--event <value>] [--actorId <value>] [--origin <value>] [--userAgent <value>] [--ipAddress <value>] [--success <value>] [--userAgentTrgmSimilarity <value>] [--searchScore <value>]
csdk audit-log delete --id <value>
```

## Examples

### List all auditLog records

```bash
csdk audit-log list
```

### Create a auditLog

```bash
csdk audit-log create --event <value> --success <value> --userAgentTrgmSimilarity <value> --searchScore <value> [--actorId <value>] [--origin <value>] [--userAgent <value>] [--ipAddress <value>]
```

### Get a auditLog by id

```bash
csdk audit-log get --id <value>
```
