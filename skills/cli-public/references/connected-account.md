# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConnectedAccount records via csdk CLI

## Usage

```bash
csdk connected-account list
csdk connected-account get --id <value>
csdk connected-account create --ownerId <value> --service <value> --identifier <value> --details <value> --isVerified <value>
csdk connected-account update --id <value> [--ownerId <value>] [--service <value>] [--identifier <value>] [--details <value>] [--isVerified <value>]
csdk connected-account delete --id <value>
```

## Examples

### List all connectedAccount records

```bash
csdk connected-account list
```

### Create a connectedAccount

```bash
csdk connected-account create --ownerId "value" --service "value" --identifier "value" --details "value" --isVerified "value"
```

### Get a connectedAccount by id

```bash
csdk connected-account get --id <value>
```
