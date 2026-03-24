# cryptoAddressesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CryptoAddressesModule records via csdk CLI

## Usage

```bash
csdk crypto-addresses-module list
csdk crypto-addresses-module get --id <UUID>
csdk crypto-addresses-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--cryptoNetwork <String>]
csdk crypto-addresses-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>] [--cryptoNetwork <String>]
csdk crypto-addresses-module delete --id <UUID>
```

## Examples

### List all cryptoAddressesModule records

```bash
csdk crypto-addresses-module list
```

### Create a cryptoAddressesModule

```bash
csdk crypto-addresses-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--cryptoNetwork <String>]
```

### Get a cryptoAddressesModule by id

```bash
csdk crypto-addresses-module get --id <value>
```
