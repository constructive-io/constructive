# email

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Email records via csdk CLI

## Usage

```bash
csdk email list
csdk email list --where.<field>.<op> <value> --orderBy <values>
csdk email list --limit 10 --after <cursor>
csdk email find-first --where.<field>.<op> <value>
csdk email get --id <UUID>
csdk email create --email <Email> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk email update --id <UUID> [--ownerId <UUID>] [--email <Email>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk email delete --id <UUID>
```

## Examples

### List email records

```bash
csdk email list
```

### List email records with pagination

```bash
csdk email list --limit 10 --offset 0
```

### List email records with cursor pagination

```bash
csdk email list --limit 10 --after <cursor>
```

### Find first matching email

```bash
csdk email find-first --where.id.equalTo <value>
```

### List email records with field selection

```bash
csdk email list --select id,id
```

### List email records with filtering and ordering

```bash
csdk email list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a email

```bash
csdk email create --email <Email> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
```

### Get a email by id

```bash
csdk email get --id <value>
```
