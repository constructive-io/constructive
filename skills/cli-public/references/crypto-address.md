# cryptoAddress

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAddress records via app CLI

## Usage

```bash
app crypto-address list
app crypto-address get --id <value>
app crypto-address create --ownerId <value> --address <value> --isVerified <value> --isPrimary <value>
app crypto-address update --id <value> [--ownerId <value>] [--address <value>] [--isVerified <value>] [--isPrimary <value>]
app crypto-address delete --id <value>
```

## Examples

### List all cryptoAddress records

```bash
app crypto-address list
```

### Create a cryptoAddress

```bash
app crypto-address create --ownerId "value" --address "value" --isVerified "value" --isPrimary "value"
```

### Get a cryptoAddress by id

```bash
app crypto-address get --id <value>
```
