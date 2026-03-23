# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAddress records via csdk CLI

## Usage

```bash
csdk crypto-address list
csdk crypto-address get --id <UUID>
csdk crypto-address create --address <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk crypto-address update --id <UUID> [--ownerId <UUID>] [--address <String>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
csdk crypto-address delete --id <UUID>
```

## Examples

### List all cryptoAddress records

```bash
csdk crypto-address list
```

### Create a cryptoAddress

```bash
csdk crypto-address create --address <String> [--ownerId <UUID>] [--isVerified <Boolean>] [--isPrimary <Boolean>]
```

### Get a cryptoAddress by id

```bash
csdk crypto-address get --id <value>
```
