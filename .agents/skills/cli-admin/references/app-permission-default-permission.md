# appPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppPermissionDefaultPermission records via csdk CLI

## Usage

```bash
csdk app-permission-default-permission list
csdk app-permission-default-permission list --where.<field>.<op> <value> --orderBy <values>
csdk app-permission-default-permission list --limit 10 --after <cursor>
csdk app-permission-default-permission find-first --where.<field>.<op> <value>
csdk app-permission-default-permission get --id <UUID>
csdk app-permission-default-permission create --permissionId <UUID>
csdk app-permission-default-permission update --id <UUID> [--permissionId <UUID>]
csdk app-permission-default-permission delete --id <UUID>
```

## Examples

### List appPermissionDefaultPermission records

```bash
csdk app-permission-default-permission list
```

### List appPermissionDefaultPermission records with pagination

```bash
csdk app-permission-default-permission list --limit 10 --offset 0
```

### List appPermissionDefaultPermission records with cursor pagination

```bash
csdk app-permission-default-permission list --limit 10 --after <cursor>
```

### Find first matching appPermissionDefaultPermission

```bash
csdk app-permission-default-permission find-first --where.id.equalTo <value>
```

### List appPermissionDefaultPermission records with field selection

```bash
csdk app-permission-default-permission list --select id,id
```

### List appPermissionDefaultPermission records with filtering and ordering

```bash
csdk app-permission-default-permission list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appPermissionDefaultPermission

```bash
csdk app-permission-default-permission create --permissionId <UUID>
```

### Get a appPermissionDefaultPermission by id

```bash
csdk app-permission-default-permission get --id <value>
```
