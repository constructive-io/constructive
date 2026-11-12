# serviceBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ServiceBinding records via csdk CLI

## Usage

```bash
csdk service-binding list
csdk service-binding list --where.<field>.<op> <value> --orderBy <values>
csdk service-binding list --limit 10 --after <cursor>
csdk service-binding find-first --where.<field>.<op> <value>
csdk service-binding get --id <UUID>
csdk service-binding create --databaseId <UUID> --installationId <UUID> --installationScope <String> --kind <String> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk service-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--installationId <UUID>] [--installationScope <String>] [--kind <String>] [--lastError <String>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk service-binding delete --id <UUID>
```

## Examples

### List serviceBinding records

```bash
csdk service-binding list
```

### List serviceBinding records with pagination

```bash
csdk service-binding list --limit 10 --offset 0
```

### List serviceBinding records with cursor pagination

```bash
csdk service-binding list --limit 10 --after <cursor>
```

### Find first matching serviceBinding

```bash
csdk service-binding find-first --where.id.equalTo <value>
```

### List serviceBinding records with field selection

```bash
csdk service-binding list --select id,id
```

### List serviceBinding records with filtering and ordering

```bash
csdk service-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a serviceBinding

```bash
csdk service-binding create --databaseId <UUID> --installationId <UUID> --installationScope <String> --kind <String> --namespaceId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--lastError <String>] [--metadata <JSON>] [--observedHost <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a serviceBinding by id

```bash
csdk service-binding get --id <value>
```
