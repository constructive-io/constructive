# orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgAdminGrant records via csdk CLI

## Usage

```bash
csdk org-admin-grant list
csdk org-admin-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-admin-grant list --limit 10 --after <cursor>
csdk org-admin-grant find-first --where.<field>.<op> <value>
csdk org-admin-grant get --id <UUID>
csdk org-admin-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk org-admin-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>]
csdk org-admin-grant delete --id <UUID>
```

## Examples

### List orgAdminGrant records

```bash
csdk org-admin-grant list
```

### List orgAdminGrant records with pagination

```bash
csdk org-admin-grant list --limit 10 --offset 0
```

### List orgAdminGrant records with cursor pagination

```bash
csdk org-admin-grant list --limit 10 --after <cursor>
```

### Find first matching orgAdminGrant

```bash
csdk org-admin-grant find-first --where.id.equalTo <value>
```

### List orgAdminGrant records with field selection

```bash
csdk org-admin-grant list --select id,id
```

### List orgAdminGrant records with filtering and ordering

```bash
csdk org-admin-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgAdminGrant

```bash
csdk org-admin-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a orgAdminGrant by id

```bash
csdk org-admin-grant get --id <value>
```
