# platformImageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformImageGrant records via csdk CLI

## Usage

```bash
csdk platform-image-grant list
csdk platform-image-grant list --where.<field>.<op> <value> --orderBy <values>
csdk platform-image-grant list --limit 10 --after <cursor>
csdk platform-image-grant find-first --where.<field>.<op> <value>
csdk platform-image-grant get --id <UUID>
csdk platform-image-grant create --granteeKey <UUID> --granteeScope <String> --imageId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-image-grant update --id <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--granteeKey <UUID>] [--granteeScope <String>] [--imageId <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-image-grant delete --id <UUID>
```

## Examples

### List platformImageGrant records

```bash
csdk platform-image-grant list
```

### List platformImageGrant records with pagination

```bash
csdk platform-image-grant list --limit 10 --offset 0
```

### List platformImageGrant records with cursor pagination

```bash
csdk platform-image-grant list --limit 10 --after <cursor>
```

### Find first matching platformImageGrant

```bash
csdk platform-image-grant find-first --where.id.equalTo <value>
```

### List platformImageGrant records with field selection

```bash
csdk platform-image-grant list --select id,id
```

### List platformImageGrant records with filtering and ordering

```bash
csdk platform-image-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformImageGrant

```bash
csdk platform-image-grant create --granteeKey <UUID> --granteeScope <String> --imageId <UUID> [--actions <String>] [--createdByPrincipal <UUID>] [--expiresAt <Datetime>] [--grantedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformImageGrant by id

```bash
csdk platform-image-grant get --id <value>
```
