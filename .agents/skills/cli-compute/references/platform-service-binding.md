# platformServiceBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformServiceBinding records via csdk CLI

## Usage

```bash
csdk platform-service-binding list
csdk platform-service-binding list --where.<field>.<op> <value> --orderBy <values>
csdk platform-service-binding list --limit 10 --after <cursor>
csdk platform-service-binding find-first --where.<field>.<op> <value>
csdk platform-service-binding get --id <UUID>
csdk platform-service-binding create --installationId <UUID> --installationScope <String> --kind <String> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-service-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--installationId <UUID>] [--installationScope <String>] [--kind <String>] [--lastError <String>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-service-binding delete --id <UUID>
```

## Examples

### List platformServiceBinding records

```bash
csdk platform-service-binding list
```

### List platformServiceBinding records with pagination

```bash
csdk platform-service-binding list --limit 10 --offset 0
```

### List platformServiceBinding records with cursor pagination

```bash
csdk platform-service-binding list --limit 10 --after <cursor>
```

### Find first matching platformServiceBinding

```bash
csdk platform-service-binding find-first --where.id.equalTo <value>
```

### List platformServiceBinding records with field selection

```bash
csdk platform-service-binding list --select id,id
```

### List platformServiceBinding records with filtering and ordering

```bash
csdk platform-service-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformServiceBinding

```bash
csdk platform-service-binding create --installationId <UUID> --installationScope <String> --kind <String> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformServiceBinding by id

```bash
csdk platform-service-binding get --id <value>
```
