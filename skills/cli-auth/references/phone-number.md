# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PhoneNumber records via csdk CLI

## Usage

```bash
csdk phone-number list
csdk phone-number get --id <value>
csdk phone-number create --ownerId <value> --cc <value> --number <value> --isVerified <value> --isPrimary <value>
csdk phone-number update --id <value> [--ownerId <value>] [--cc <value>] [--number <value>] [--isVerified <value>] [--isPrimary <value>]
csdk phone-number delete --id <value>
```

## Examples

### List all phoneNumber records

```bash
csdk phone-number list
```

### Create a phoneNumber

```bash
csdk phone-number create --ownerId "value" --cc "value" --number "value" --isVerified "value" --isPrimary "value"
```

### Get a phoneNumber by id

```bash
csdk phone-number get --id <value>
```
