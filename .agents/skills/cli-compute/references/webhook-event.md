# webhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebhookEvent records via csdk CLI

## Usage

```bash
csdk webhook-event list
csdk webhook-event list --where.<field>.<op> <value> --orderBy <values>
csdk webhook-event list --limit 10 --after <cursor>
csdk webhook-event find-first --where.<field>.<op> <value>
csdk webhook-event get --id <UUID>
csdk webhook-event create --databaseId <UUID> --endpointId <UUID> --externalEventId <String> --provider <String> [--error <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--providerTimestamp <Datetime>] [--status <String>]
csdk webhook-event update --id <UUID> [--databaseId <UUID>] [--endpointId <UUID>] [--error <String>] [--externalEventId <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--provider <String>] [--providerTimestamp <Datetime>] [--status <String>]
csdk webhook-event delete --id <UUID>
```

## Examples

### List webhookEvent records

```bash
csdk webhook-event list
```

### List webhookEvent records with pagination

```bash
csdk webhook-event list --limit 10 --offset 0
```

### List webhookEvent records with cursor pagination

```bash
csdk webhook-event list --limit 10 --after <cursor>
```

### Find first matching webhookEvent

```bash
csdk webhook-event find-first --where.id.equalTo <value>
```

### List webhookEvent records with field selection

```bash
csdk webhook-event list --select id,id
```

### List webhookEvent records with filtering and ordering

```bash
csdk webhook-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webhookEvent

```bash
csdk webhook-event create --databaseId <UUID> --endpointId <UUID> --externalEventId <String> --provider <String> [--error <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--providerTimestamp <Datetime>] [--status <String>]
```

### Get a webhookEvent by id

```bash
csdk webhook-event get --id <value>
```
