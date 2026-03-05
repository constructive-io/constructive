# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Email records via csdk CLI

## Usage

```bash
csdk email list
csdk email get --id <value>
csdk email create --ownerId <value> --email <value> --isVerified <value> --isPrimary <value>
csdk email update --id <value> [--ownerId <value>] [--email <value>] [--isVerified <value>] [--isPrimary <value>]
csdk email delete --id <value>
```

## Examples

### List all email records

```bash
csdk email list
```

### Create a email

```bash
csdk email create --ownerId "value" --email "value" --isVerified "value" --isPrimary "value"
```

### Get a email by id

```bash
csdk email get --id <value>
```
