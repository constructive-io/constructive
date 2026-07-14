# orgPermissionDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgPermissionDefaultGrant records via csdk CLI

## Usage

```bash
csdk org-permission-default-grant list
csdk org-permission-default-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-permission-default-grant list --limit 10 --after <cursor>
csdk org-permission-default-grant find-first --where.<field>.<op> <value>
csdk org-permission-default-grant get --id <UUID>
csdk org-permission-default-grant create --entityId <UUID> --permissionId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
csdk org-permission-default-grant update --id <UUID> [--entityId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>] [--permissionId <UUID>]
csdk org-permission-default-grant delete --id <UUID>
```

## Examples

### List orgPermissionDefaultGrant records

```bash
csdk org-permission-default-grant list
```

### List orgPermissionDefaultGrant records with pagination

```bash
csdk org-permission-default-grant list --limit 10 --offset 0
```

### List orgPermissionDefaultGrant records with cursor pagination

```bash
csdk org-permission-default-grant list --limit 10 --after <cursor>
```

### Find first matching orgPermissionDefaultGrant

```bash
csdk org-permission-default-grant find-first --where.id.equalTo <value>
```

### List orgPermissionDefaultGrant records with field selection

```bash
csdk org-permission-default-grant list --select id,id
```

### List orgPermissionDefaultGrant records with filtering and ordering

```bash
csdk org-permission-default-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgPermissionDefaultGrant

```bash
csdk org-permission-default-grant create --entityId <UUID> --permissionId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
```

### Get a orgPermissionDefaultGrant by id

```bash
csdk org-permission-default-grant get --id <value>
```
