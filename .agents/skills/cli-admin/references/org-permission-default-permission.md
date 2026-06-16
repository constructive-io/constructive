# orgPermissionDefaultPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgPermissionDefaultPermission records via csdk CLI

## Usage

```bash
csdk org-permission-default-permission list
csdk org-permission-default-permission list --where.<field>.<op> <value> --orderBy <values>
csdk org-permission-default-permission list --limit 10 --after <cursor>
csdk org-permission-default-permission find-first --where.<field>.<op> <value>
csdk org-permission-default-permission get --id <UUID>
csdk org-permission-default-permission create --permissionId <UUID> --entityId <UUID>
csdk org-permission-default-permission update --id <UUID> [--permissionId <UUID>] [--entityId <UUID>]
csdk org-permission-default-permission delete --id <UUID>
```

## Examples

### List orgPermissionDefaultPermission records

```bash
csdk org-permission-default-permission list
```

### List orgPermissionDefaultPermission records with pagination

```bash
csdk org-permission-default-permission list --limit 10 --offset 0
```

### List orgPermissionDefaultPermission records with cursor pagination

```bash
csdk org-permission-default-permission list --limit 10 --after <cursor>
```

### Find first matching orgPermissionDefaultPermission

```bash
csdk org-permission-default-permission find-first --where.id.equalTo <value>
```

### List orgPermissionDefaultPermission records with field selection

```bash
csdk org-permission-default-permission list --select id,id
```

### List orgPermissionDefaultPermission records with filtering and ordering

```bash
csdk org-permission-default-permission list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgPermissionDefaultPermission

```bash
csdk org-permission-default-permission create --permissionId <UUID> --entityId <UUID>
```

### Get a orgPermissionDefaultPermission by id

```bash
csdk org-permission-default-permission get --id <value>
```
