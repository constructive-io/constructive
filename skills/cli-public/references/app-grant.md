# appGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppGrant records via app CLI

## Usage

```bash
app app-grant list
app app-grant get --id <value>
app app-grant create --permissions <value> --isGrant <value> --actorId <value> --grantorId <value>
app app-grant update --id <value> [--permissions <value>] [--isGrant <value>] [--actorId <value>] [--grantorId <value>]
app app-grant delete --id <value>
```

## Examples

### List all appGrant records

```bash
app app-grant list
```

### Create a appGrant

```bash
app app-grant create --permissions "value" --isGrant "value" --actorId "value" --grantorId "value"
```

### Get a appGrant by id

```bash
app app-grant get --id <value>
```
