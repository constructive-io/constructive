# platformRegistryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRegistryBinding records via csdk CLI

## Usage

```bash
csdk platform-registry-binding list
csdk platform-registry-binding list --where.<field>.<op> <value> --orderBy <values>
csdk platform-registry-binding list --limit 10 --after <cursor>
csdk platform-registry-binding find-first --where.<field>.<op> <value>
csdk platform-registry-binding get --id <UUID>
csdk platform-registry-binding create --namespaceId <UUID> --registryHost <String> --registryId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--metadata <JSON>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-registry-binding update --id <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--metadata <JSON>] [--namespaceId <UUID>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--registryHost <String>] [--registryId <UUID>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-registry-binding delete --id <UUID>
```

## Examples

### List platformRegistryBinding records

```bash
csdk platform-registry-binding list
```

### List platformRegistryBinding records with pagination

```bash
csdk platform-registry-binding list --limit 10 --offset 0
```

### List platformRegistryBinding records with cursor pagination

```bash
csdk platform-registry-binding list --limit 10 --after <cursor>
```

### Find first matching platformRegistryBinding

```bash
csdk platform-registry-binding find-first --where.id.equalTo <value>
```

### List platformRegistryBinding records with field selection

```bash
csdk platform-registry-binding list --select id,id
```

### List platformRegistryBinding records with filtering and ordering

```bash
csdk platform-registry-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRegistryBinding

```bash
csdk platform-registry-binding create --namespaceId <UUID> --registryHost <String> --registryId <UUID> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--metadata <JSON>] [--observedCredentialVersion <String>] [--pullSecretName <String>] [--realm <String>] [--status <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformRegistryBinding by id

```bash
csdk platform-registry-binding get --id <value>
```
