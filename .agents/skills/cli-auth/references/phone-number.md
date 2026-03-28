# phoneNumber

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PhoneNumber records via csdk CLI

## Usage

```bash
csdk phone-number list
csdk phone-number list --where.<field>.<op> <value> --orderBy <values>
csdk phone-number list --limit 10 --after <cursor>
csdk phone-number find-first --where.<field>.<op> <value>
csdk phone-number get --id <UUID>
csdk phone-number create --cc <String> --number <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk phone-number update --id <UUID> [--ownerId <UUID>] [--cc <String>] [--number <String>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk phone-number delete --id <UUID>
```

## Examples

### List phoneNumber records

```bash
csdk phone-number list
```

### List phoneNumber records with pagination

```bash
csdk phone-number list --limit 10 --offset 0
```

### List phoneNumber records with cursor pagination

```bash
csdk phone-number list --limit 10 --after <cursor>
```

### Find first matching phoneNumber

```bash
csdk phone-number find-first --where.id.equalTo <value>
```

### List phoneNumber records with field selection

```bash
csdk phone-number list --select id,id
```

### List phoneNumber records with filtering and ordering

```bash
csdk phone-number list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a phoneNumber

```bash
csdk phone-number create --cc <String> --number <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
```

### Get a phoneNumber by id

```bash
csdk phone-number get --id <value>
```
