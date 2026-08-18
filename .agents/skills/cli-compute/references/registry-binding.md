# registryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RegistryBinding records via csdk CLI

## Usage

```bash
csdk registry-binding list
csdk registry-binding list --where.<field>.<op> <value> --orderBy <values>
csdk registry-binding list --limit 10 --after <cursor>
csdk registry-binding find-first --where.<field>.<op> <value>
csdk registry-binding get --id <UUID>
csdk registry-binding create --databaseId <UUID> --namespaceId <UUID> --registryHost <String> --registryId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--metadata <JSON>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk registry-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--registryHost <String>] [--registryId <UUID>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk registry-binding delete --id <UUID>
```

## Examples

### List registryBinding records

```bash
csdk registry-binding list
```

### List registryBinding records with pagination

```bash
csdk registry-binding list --limit 10 --offset 0
```

### List registryBinding records with cursor pagination

```bash
csdk registry-binding list --limit 10 --after <cursor>
```

### Find first matching registryBinding

```bash
csdk registry-binding find-first --where.id.equalTo <value>
```

### List registryBinding records with field selection

```bash
csdk registry-binding list --select id,id
```

### List registryBinding records with filtering and ordering

```bash
csdk registry-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a registryBinding

```bash
csdk registry-binding create --databaseId <UUID> --namespaceId <UUID> --registryHost <String> --registryId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--metadata <JSON>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a registryBinding by id

```bash
csdk registry-binding get --id <value>
```
