# platformBuilderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformBuilderBinding records via csdk CLI

## Usage

```bash
csdk platform-builder-binding list
csdk platform-builder-binding list --where.<field>.<op> <value> --orderBy <values>
csdk platform-builder-binding list --limit 10 --after <cursor>
csdk platform-builder-binding find-first --where.<field>.<op> <value>
csdk platform-builder-binding get --id <UUID>
csdk platform-builder-binding create --installationId <UUID> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-builder-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--installationId <UUID>] [--lastError <String>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-builder-binding delete --id <UUID>
```

## Examples

### List platformBuilderBinding records

```bash
csdk platform-builder-binding list
```

### List platformBuilderBinding records with pagination

```bash
csdk platform-builder-binding list --limit 10 --offset 0
```

### List platformBuilderBinding records with cursor pagination

```bash
csdk platform-builder-binding list --limit 10 --after <cursor>
```

### Find first matching platformBuilderBinding

```bash
csdk platform-builder-binding find-first --where.id.equalTo <value>
```

### List platformBuilderBinding records with field selection

```bash
csdk platform-builder-binding list --select id,id
```

### List platformBuilderBinding records with filtering and ordering

```bash
csdk platform-builder-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformBuilderBinding

```bash
csdk platform-builder-binding create --installationId <UUID> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformBuilderBinding by id

```bash
csdk platform-builder-binding get --id <value>
```
