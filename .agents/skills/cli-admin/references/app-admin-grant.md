# appAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppAdminGrant records via csdk CLI

## Usage

```bash
csdk app-admin-grant list
csdk app-admin-grant get --id <UUID>
csdk app-admin-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-admin-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-admin-grant delete --id <UUID>
```

## Examples

### List all appAdminGrant records

```bash
csdk app-admin-grant list
```

### Create a appAdminGrant

```bash
csdk app-admin-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appAdminGrant by id

```bash
csdk app-admin-grant get --id <value>
```
