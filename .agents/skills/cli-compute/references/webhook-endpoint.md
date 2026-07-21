# webhookEndpoint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebhookEndpoint records via csdk CLI

## Usage

```bash
csdk webhook-endpoint list
csdk webhook-endpoint list --where.<field>.<op> <value> --orderBy <values>
csdk webhook-endpoint list --limit 10 --after <cursor>
csdk webhook-endpoint find-first --where.<field>.<op> <value>
csdk webhook-endpoint get --id <UUID>
csdk webhook-endpoint create --databaseId <UUID> --functionDefinitionId <UUID> --host <String> --namespaceId <UUID> --path <String> --signingSecretName <String> [--active <Boolean>] [--createdBy <UUID>] [--provider <String>] [--replayWindowSeconds <Int>] [--updatedBy <UUID>]
csdk webhook-endpoint update --id <UUID> [--active <Boolean>] [--createdBy <UUID>] [--databaseId <UUID>] [--functionDefinitionId <UUID>] [--host <String>] [--namespaceId <UUID>] [--path <String>] [--provider <String>] [--replayWindowSeconds <Int>] [--signingSecretName <String>] [--updatedBy <UUID>]
csdk webhook-endpoint delete --id <UUID>
```

## Examples

### List webhookEndpoint records

```bash
csdk webhook-endpoint list
```

### List webhookEndpoint records with pagination

```bash
csdk webhook-endpoint list --limit 10 --offset 0
```

### List webhookEndpoint records with cursor pagination

```bash
csdk webhook-endpoint list --limit 10 --after <cursor>
```

### Find first matching webhookEndpoint

```bash
csdk webhook-endpoint find-first --where.id.equalTo <value>
```

### List webhookEndpoint records with field selection

```bash
csdk webhook-endpoint list --select id,id
```

### List webhookEndpoint records with filtering and ordering

```bash
csdk webhook-endpoint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webhookEndpoint

```bash
csdk webhook-endpoint create --databaseId <UUID> --functionDefinitionId <UUID> --host <String> --namespaceId <UUID> --path <String> --signingSecretName <String> [--active <Boolean>] [--createdBy <UUID>] [--provider <String>] [--replayWindowSeconds <Int>] [--updatedBy <UUID>]
```

### Get a webhookEndpoint by id

```bash
csdk webhook-endpoint get --id <value>
```
