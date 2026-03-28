# appAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppAdminGrant records via csdk CLI

## Usage

```bash
csdk app-admin-grant list
csdk app-admin-grant list --where.<field>.<op> <value> --orderBy <values>
csdk app-admin-grant list --limit 10 --after <cursor>
csdk app-admin-grant find-first --where.<field>.<op> <value>
csdk app-admin-grant get --id <UUID>
csdk app-admin-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-admin-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-admin-grant delete --id <UUID>
```

## Examples

### List appAdminGrant records

```bash
csdk app-admin-grant list
```

### List appAdminGrant records with pagination

```bash
csdk app-admin-grant list --limit 10 --offset 0
```

### List appAdminGrant records with cursor pagination

```bash
csdk app-admin-grant list --limit 10 --after <cursor>
```

### Find first matching appAdminGrant

```bash
csdk app-admin-grant find-first --where.id.equalTo <value>
```

### List appAdminGrant records with field selection

```bash
csdk app-admin-grant list --select id,id
```

### List appAdminGrant records with filtering and ordering

```bash
csdk app-admin-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appAdminGrant

```bash
csdk app-admin-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appAdminGrant by id

```bash
csdk app-admin-grant get --id <value>
```
