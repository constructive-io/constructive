# builderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BuilderBinding records via csdk CLI

## Usage

```bash
csdk builder-binding list
csdk builder-binding list --where.<field>.<op> <value> --orderBy <values>
csdk builder-binding list --limit 10 --after <cursor>
csdk builder-binding find-first --where.<field>.<op> <value>
csdk builder-binding get --id <UUID>
csdk builder-binding create --databaseId <UUID> --installationId <UUID> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk builder-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--installationId <UUID>] [--lastError <String>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk builder-binding delete --id <UUID>
```

## Examples

### List builderBinding records

```bash
csdk builder-binding list
```

### List builderBinding records with pagination

```bash
csdk builder-binding list --limit 10 --offset 0
```

### List builderBinding records with cursor pagination

```bash
csdk builder-binding list --limit 10 --after <cursor>
```

### Find first matching builderBinding

```bash
csdk builder-binding find-first --where.id.equalTo <value>
```

### List builderBinding records with field selection

```bash
csdk builder-binding list --select id,id
```

### List builderBinding records with filtering and ordering

```bash
csdk builder-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a builderBinding

```bash
csdk builder-binding create --databaseId <UUID> --installationId <UUID> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a builderBinding by id

```bash
csdk builder-binding get --id <value>
```
