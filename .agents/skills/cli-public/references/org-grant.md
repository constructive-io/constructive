# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGrant records via csdk CLI

## Usage

```bash
csdk org-grant list
csdk org-grant get --id <UUID>
csdk org-grant create --actorId <UUID> --entityId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
csdk org-grant update --id <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--actorId <UUID>] [--entityId <UUID>] [--grantorId <UUID>]
csdk org-grant delete --id <UUID>
```

## Examples

### List all orgGrant records

```bash
csdk org-grant list
```

### Create a orgGrant

```bash
csdk org-grant create --actorId <UUID> --entityId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a orgGrant by id

```bash
csdk org-grant get --id <value>
```
