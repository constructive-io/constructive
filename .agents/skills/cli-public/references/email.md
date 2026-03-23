# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Email records via csdk CLI

## Usage

```bash
csdk email list
csdk email get --id <UUID>
csdk email create --email <Email> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk email update --id <UUID> [--ownerId <UUID>] [--email <Email>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk email delete --id <UUID>
```

## Examples

### List all email records

```bash
csdk email list
```

### Create a email

```bash
csdk email create --email <Email> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
```

### Get a email by id

```bash
csdk email get --id <value>
```
