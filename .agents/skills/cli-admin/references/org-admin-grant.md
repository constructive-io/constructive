# orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgAdminGrant records via csdk CLI

## Usage

```bash
csdk org-admin-grant list
csdk org-admin-grant get --id <UUID>
csdk org-admin-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk org-admin-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>]
csdk org-admin-grant delete --id <UUID>
```

## Examples

### List all orgAdminGrant records

```bash
csdk org-admin-grant list
```

### Create a orgAdminGrant

```bash
csdk org-admin-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a orgAdminGrant by id

```bash
csdk org-admin-grant get --id <value>
```
