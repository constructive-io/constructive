# auditLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AuditLog records via app CLI

## Usage

```bash
app audit-log list
app audit-log get --id <value>
app audit-log create --event <value> --actorId <value> --origin <value> --userAgent <value> --ipAddress <value> --success <value>
app audit-log update --id <value> [--event <value>] [--actorId <value>] [--origin <value>] [--userAgent <value>] [--ipAddress <value>] [--success <value>]
app audit-log delete --id <value>
```

## Examples

### List all auditLog records

```bash
app audit-log list
```

### Create a auditLog

```bash
app audit-log create --event "value" --actorId "value" --origin "value" --userAgent "value" --ipAddress "value" --success "value"
```

### Get a auditLog by id

```bash
app audit-log get --id <value>
```
