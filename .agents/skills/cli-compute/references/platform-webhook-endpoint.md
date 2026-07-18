# platformWebhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformWebhookEndpoint records via csdk CLI

## Usage

```bash
csdk platform-webhook-endpoint list
csdk platform-webhook-endpoint list --where.<field>.<op> <value> --orderBy <values>
csdk platform-webhook-endpoint list --limit 10 --after <cursor>
csdk platform-webhook-endpoint find-first --where.<field>.<op> <value>
csdk platform-webhook-endpoint get --id <UUID>
csdk platform-webhook-endpoint create --functionDefinitionId <UUID> --host <String> --namespaceId <UUID> --path <String> --signingSecretName <String> [--active <Boolean>] [--createdBy <UUID>] [--provider <String>] [--replayWindowSeconds <Int>] [--updatedBy <UUID>]
csdk platform-webhook-endpoint update --id <UUID> [--active <Boolean>] [--createdBy <UUID>] [--functionDefinitionId <UUID>] [--host <String>] [--namespaceId <UUID>] [--path <String>] [--provider <String>] [--replayWindowSeconds <Int>] [--signingSecretName <String>] [--updatedBy <UUID>]
csdk platform-webhook-endpoint delete --id <UUID>
```

## Examples

### List platformWebhookEndpoint records

```bash
csdk platform-webhook-endpoint list
```

### List platformWebhookEndpoint records with pagination

```bash
csdk platform-webhook-endpoint list --limit 10 --offset 0
```

### List platformWebhookEndpoint records with cursor pagination

```bash
csdk platform-webhook-endpoint list --limit 10 --after <cursor>
```

### Find first matching platformWebhookEndpoint

```bash
csdk platform-webhook-endpoint find-first --where.id.equalTo <value>
```

### List platformWebhookEndpoint records with field selection

```bash
csdk platform-webhook-endpoint list --select id,id
```

### List platformWebhookEndpoint records with filtering and ordering

```bash
csdk platform-webhook-endpoint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformWebhookEndpoint

```bash
csdk platform-webhook-endpoint create --functionDefinitionId <UUID> --host <String> --namespaceId <UUID> --path <String> --signingSecretName <String> [--active <Boolean>] [--createdBy <UUID>] [--provider <String>] [--replayWindowSeconds <Int>] [--updatedBy <UUID>]
```

### Get a platformWebhookEndpoint by id

```bash
csdk platform-webhook-endpoint get --id <value>
```
