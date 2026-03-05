# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PhoneNumber records via app CLI

## Usage

```bash
app phone-number list
app phone-number get --id <value>
app phone-number create --ownerId <value> --cc <value> --number <value> --isVerified <value> --isPrimary <value>
app phone-number update --id <value> [--ownerId <value>] [--cc <value>] [--number <value>] [--isVerified <value>] [--isPrimary <value>]
app phone-number delete --id <value>
```

## Examples

### List all phoneNumber records

```bash
app phone-number list
```

### Create a phoneNumber

```bash
app phone-number create --ownerId "value" --cc "value" --number "value" --isVerified "value" --isPrimary "value"
```

### Get a phoneNumber by id

```bash
app phone-number get --id <value>
```
