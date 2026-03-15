# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAddress records via csdk CLI

## Usage

```bash
csdk crypto-address list
csdk crypto-address get --id <value>
csdk crypto-address create --address <value> --addressTrgmSimilarity <value> --searchScore <value> [--ownerId <value>] [--isVerified <value>] [--isPrimary <value>]
csdk crypto-address update --id <value> [--ownerId <value>] [--address <value>] [--isVerified <value>] [--isPrimary <value>] [--addressTrgmSimilarity <value>] [--searchScore <value>]
csdk crypto-address delete --id <value>
```

## Examples

### List all cryptoAddress records

```bash
csdk crypto-address list
```

### Create a cryptoAddress

```bash
csdk crypto-address create --address <value> --addressTrgmSimilarity <value> --searchScore <value> [--ownerId <value>] [--isVerified <value>] [--isPrimary <value>]
```

### Get a cryptoAddress by id

```bash
csdk crypto-address get --id <value>
```
