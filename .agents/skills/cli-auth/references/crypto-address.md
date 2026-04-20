# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAddress records via csdk CLI

## Usage

```bash
csdk crypto-address list
csdk crypto-address list --where.<field>.<op> <value> --orderBy <values>
csdk crypto-address list --limit 10 --after <cursor>
csdk crypto-address find-first --where.<field>.<op> <value>
csdk crypto-address get --id <UUID>
csdk crypto-address create --address <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>] [--name <String>]
csdk crypto-address update --id <UUID> [--ownerId <UUID>] [--address <String>] [--isVerified <Boolean>] [--isPrimary <Boolean>] [--name <String>]
csdk crypto-address delete --id <UUID>
```

## Examples

### List cryptoAddress records

```bash
csdk crypto-address list
```

### List cryptoAddress records with pagination

```bash
csdk crypto-address list --limit 10 --offset 0
```

### List cryptoAddress records with cursor pagination

```bash
csdk crypto-address list --limit 10 --after <cursor>
```

### Find first matching cryptoAddress

```bash
csdk crypto-address find-first --where.id.equalTo <value>
```

### List cryptoAddress records with field selection

```bash
csdk crypto-address list --select id,id
```

### List cryptoAddress records with filtering and ordering

```bash
csdk crypto-address list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a cryptoAddress

```bash
csdk crypto-address create --address <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>] [--name <String>]
```

### Get a cryptoAddress by id

```bash
csdk crypto-address get --id <value>
```
