# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConnectedAccount records via csdk CLI

## Usage

```bash
csdk connected-account list
csdk connected-account get --id <UUID>
csdk connected-account create --service <String> --identifier <String> --details <JSON> [--ownerId <UUID>] [--isVerified <Boolean>]
csdk connected-account update --id <UUID> [--ownerId <UUID>] [--service <String>] [--identifier <String>] [--details <JSON>] [--isVerified <Boolean>]
csdk connected-account delete --id <UUID>
```

## Examples

### List all connectedAccount records

```bash
csdk connected-account list
```

### Create a connectedAccount

```bash
csdk connected-account create --service <String> --identifier <String> --details <JSON> [--ownerId <UUID>] [--isVerified <Boolean>]
```

### Get a connectedAccount by id

```bash
csdk connected-account get --id <value>
```
