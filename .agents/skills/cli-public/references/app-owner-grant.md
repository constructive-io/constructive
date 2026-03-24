# appOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppOwnerGrant records via csdk CLI

## Usage

```bash
csdk app-owner-grant list
csdk app-owner-grant get --id <UUID>
csdk app-owner-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-owner-grant update --id <UUID> [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-owner-grant delete --id <UUID>
```

## Examples

### List all appOwnerGrant records

```bash
csdk app-owner-grant list
```

### Create a appOwnerGrant

```bash
csdk app-owner-grant create --actorId <UUID> [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appOwnerGrant by id

```bash
csdk app-owner-grant get --id <value>
```
