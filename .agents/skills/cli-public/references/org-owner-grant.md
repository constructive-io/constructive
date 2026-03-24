# orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgOwnerGrant records via csdk CLI

## Usage

```bash
csdk org-owner-grant list
csdk org-owner-grant get --id <UUID>
csdk org-owner-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk org-owner-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>]
csdk org-owner-grant delete --id <UUID>
```

## Examples

### List all orgOwnerGrant records

```bash
csdk org-owner-grant list
```

### Create a orgOwnerGrant

```bash
csdk org-owner-grant create --actorId <UUID> --entityId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a orgOwnerGrant by id

```bash
csdk org-owner-grant get --id <value>
```
