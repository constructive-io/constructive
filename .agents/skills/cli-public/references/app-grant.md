# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppGrant records via csdk CLI

## Usage

```bash
csdk app-grant list
csdk app-grant get --id <UUID>
csdk app-grant create --actorId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
csdk app-grant update --id <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--actorId <UUID>] [--grantorId <UUID>]
csdk app-grant delete --id <UUID>
```

## Examples

### List all appGrant records

```bash
csdk app-grant list
```

### Create a appGrant

```bash
csdk app-grant create --actorId <UUID> [--permissions <BitString>] [--isGrant <Boolean>] [--grantorId <UUID>]
```

### Get a appGrant by id

```bash
csdk app-grant get --id <value>
```
