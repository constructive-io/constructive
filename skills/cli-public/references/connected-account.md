# connectedAccount

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConnectedAccount records via app CLI

## Usage

```bash
app connected-account list
app connected-account get --id <value>
app connected-account create --ownerId <value> --service <value> --identifier <value> --details <value> --isVerified <value>
app connected-account update --id <value> [--ownerId <value>] [--service <value>] [--identifier <value>] [--details <value>] [--isVerified <value>]
app connected-account delete --id <value>
```

## Examples

### List all connectedAccount records

```bash
app connected-account list
```

### Create a connectedAccount

```bash
app connected-account create --ownerId "value" --service "value" --identifier "value" --details "value" --isVerified "value"
```

### Get a connectedAccount by id

```bash
app connected-account get --id <value>
```
