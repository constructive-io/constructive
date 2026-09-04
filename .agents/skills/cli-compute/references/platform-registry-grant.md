# platformRegistryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRegistryGrant records via csdk CLI

## Usage

```bash
csdk platform-registry-grant list
csdk platform-registry-grant list --where.<field>.<op> <value> --orderBy <values>
csdk platform-registry-grant list --limit 10 --after <cursor>
csdk platform-registry-grant find-first --where.<field>.<op> <value>
csdk platform-registry-grant get --id <UUID>
csdk platform-registry-grant create --granteeKey <UUID> --granteeScope <String> --registryId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-registry-grant update --id <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--granteeKey <UUID>] [--granteeScope <String>] [--registryId <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-registry-grant delete --id <UUID>
```

## Examples

### List platformRegistryGrant records

```bash
csdk platform-registry-grant list
```

### List platformRegistryGrant records with pagination

```bash
csdk platform-registry-grant list --limit 10 --offset 0
```

### List platformRegistryGrant records with cursor pagination

```bash
csdk platform-registry-grant list --limit 10 --after <cursor>
```

### Find first matching platformRegistryGrant

```bash
csdk platform-registry-grant find-first --where.id.equalTo <value>
```

### List platformRegistryGrant records with field selection

```bash
csdk platform-registry-grant list --select id,id
```

### List platformRegistryGrant records with filtering and ordering

```bash
csdk platform-registry-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRegistryGrant

```bash
csdk platform-registry-grant create --granteeKey <UUID> --granteeScope <String> --registryId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformRegistryGrant by id

```bash
csdk platform-registry-grant get --id <value>
```
