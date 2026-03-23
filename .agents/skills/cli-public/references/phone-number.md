# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PhoneNumber records via csdk CLI

## Usage

```bash
csdk phone-number list
csdk phone-number get --id <UUID>
csdk phone-number create --cc <String> --number <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk phone-number update --id <UUID> [--ownerId <UUID>] [--cc <String>] [--number <String>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk phone-number delete --id <UUID>
```

## Examples

### List all phoneNumber records

```bash
csdk phone-number list
```

### Create a phoneNumber

```bash
csdk phone-number create --cc <String> --number <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
```

### Get a phoneNumber by id

```bash
csdk phone-number get --id <value>
```
