# platformWebhookEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformWebhookEvent records via csdk CLI

## Usage

```bash
csdk platform-webhook-event list
csdk platform-webhook-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-webhook-event list --limit 10 --after <cursor>
csdk platform-webhook-event find-first --where.<field>.<op> <value>
csdk platform-webhook-event get --id <UUID>
csdk platform-webhook-event create --endpointId <UUID> --externalEventId <String> --provider <String> [--error <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--providerTimestamp <Datetime>] [--status <String>]
csdk platform-webhook-event update --id <UUID> [--endpointId <UUID>] [--error <String>] [--externalEventId <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--provider <String>] [--providerTimestamp <Datetime>] [--status <String>]
csdk platform-webhook-event delete --id <UUID>
```

## Examples

### List platformWebhookEvent records

```bash
csdk platform-webhook-event list
```

### List platformWebhookEvent records with pagination

```bash
csdk platform-webhook-event list --limit 10 --offset 0
```

### List platformWebhookEvent records with cursor pagination

```bash
csdk platform-webhook-event list --limit 10 --after <cursor>
```

### Find first matching platformWebhookEvent

```bash
csdk platform-webhook-event find-first --where.id.equalTo <value>
```

### List platformWebhookEvent records with field selection

```bash
csdk platform-webhook-event list --select id,id
```

### List platformWebhookEvent records with filtering and ordering

```bash
csdk platform-webhook-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformWebhookEvent

```bash
csdk platform-webhook-event create --endpointId <UUID> --externalEventId <String> --provider <String> [--error <String>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--payload <JSON>] [--providerTimestamp <Datetime>] [--status <String>]
```

### Get a platformWebhookEvent by id

```bash
csdk platform-webhook-event get --id <value>
```
