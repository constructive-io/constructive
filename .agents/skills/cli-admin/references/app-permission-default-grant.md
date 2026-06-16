# appPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppPermissionDefaultGrant records via csdk CLI

## Usage

```bash
csdk app-permission-default-grant list
csdk app-permission-default-grant list --where.<field>.<op> <value> --orderBy <values>
csdk app-permission-default-grant list --limit 10 --after <cursor>
csdk app-permission-default-grant find-first --where.<field>.<op> <value>
csdk app-permission-default-grant get --id <UUID>
csdk app-permission-default-grant create --permissionId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-permission-default-grant update --id <UUID> [--permissionId <UUID>] [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-permission-default-grant delete --id <UUID>
```

## Examples

### List appPermissionDefaultGrant records

```bash
csdk app-permission-default-grant list
```

### List appPermissionDefaultGrant records with pagination

```bash
csdk app-permission-default-grant list --limit 10 --offset 0
```

### List appPermissionDefaultGrant records with cursor pagination

```bash
csdk app-permission-default-grant list --limit 10 --after <cursor>
```

### Find first matching appPermissionDefaultGrant

```bash
csdk app-permission-default-grant find-first --where.id.equalTo <value>
```

### List appPermissionDefaultGrant records with field selection

```bash
csdk app-permission-default-grant list --select id,id
```

### List appPermissionDefaultGrant records with filtering and ordering

```bash
csdk app-permission-default-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appPermissionDefaultGrant

```bash
csdk app-permission-default-grant create --permissionId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appPermissionDefaultGrant by id

```bash
csdk app-permission-default-grant get --id <value>
```
