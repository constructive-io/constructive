# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppGrant records via csdk CLI

## Usage

```bash
csdk app-grant list
csdk app-grant get --id <value>
csdk app-grant create --actorId <value> [--permissions <value>] [--isGrant <value>] [--grantorId <value>]
csdk app-grant update --id <value> [--permissions <value>] [--isGrant <value>] [--actorId <value>] [--grantorId <value>]
csdk app-grant delete --id <value>
```

## Examples

### List all appGrant records

```bash
csdk app-grant list
```

### Create a appGrant

```bash
csdk app-grant create --actorId <value> [--permissions <value>] [--isGrant <value>] [--grantorId <value>]
```

### Get a appGrant by id

```bash
csdk app-grant get --id <value>
```
