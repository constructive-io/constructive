# registryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RegistryGrant records via csdk CLI

## Usage

```bash
csdk registry-grant list
csdk registry-grant list --where.<field>.<op> <value> --orderBy <values>
csdk registry-grant list --limit 10 --after <cursor>
csdk registry-grant find-first --where.<field>.<op> <value>
csdk registry-grant get --id <UUID>
csdk registry-grant create --databaseId <UUID> --granteeKey <UUID> --granteeScope <String> --registryId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk registry-grant update --id <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--granteeKey <UUID>] [--granteeScope <String>] [--registryId <UUID>] [--updatedByPrincipal <UUID>]
csdk registry-grant delete --id <UUID>
```

## Examples

### List registryGrant records

```bash
csdk registry-grant list
```

### List registryGrant records with pagination

```bash
csdk registry-grant list --limit 10 --offset 0
```

### List registryGrant records with cursor pagination

```bash
csdk registry-grant list --limit 10 --after <cursor>
```

### Find first matching registryGrant

```bash
csdk registry-grant find-first --where.id.equalTo <value>
```

### List registryGrant records with field selection

```bash
csdk registry-grant list --select id,id
```

### List registryGrant records with filtering and ordering

```bash
csdk registry-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a registryGrant

```bash
csdk registry-grant create --databaseId <UUID> --granteeKey <UUID> --granteeScope <String> --registryId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a registryGrant by id

```bash
csdk registry-grant get --id <value>
```
