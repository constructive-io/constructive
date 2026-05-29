# merkleStoreModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MerkleStoreModule records via csdk CLI

## Usage

```bash
csdk merkle-store-module list
csdk merkle-store-module list --where.<field>.<op> <value> --orderBy <values>
csdk merkle-store-module list --limit 10 --after <cursor>
csdk merkle-store-module find-first --where.<field>.<op> <value>
csdk merkle-store-module get --id <UUID>
csdk merkle-store-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--objectTableId <UUID>] [--storeTableId <UUID>] [--commitTableId <UUID>] [--refTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>] [--scopeField <String>]
csdk merkle-store-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--objectTableId <UUID>] [--storeTableId <UUID>] [--commitTableId <UUID>] [--refTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>] [--scopeField <String>]
csdk merkle-store-module delete --id <UUID>
```

## Examples

### List merkleStoreModule records

```bash
csdk merkle-store-module list
```

### List merkleStoreModule records with pagination

```bash
csdk merkle-store-module list --limit 10 --offset 0
```

### List merkleStoreModule records with cursor pagination

```bash
csdk merkle-store-module list --limit 10 --after <cursor>
```

### Find first matching merkleStoreModule

```bash
csdk merkle-store-module find-first --where.id.equalTo <value>
```

### List merkleStoreModule records with field selection

```bash
csdk merkle-store-module list --select id,id
```

### List merkleStoreModule records with filtering and ordering

```bash
csdk merkle-store-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a merkleStoreModule

```bash
csdk merkle-store-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--objectTableId <UUID>] [--storeTableId <UUID>] [--commitTableId <UUID>] [--refTableId <UUID>] [--prefix <String>] [--apiName <String>] [--privateApiName <String>] [--scopeField <String>]
```

### Get a merkleStoreModule by id

```bash
csdk merkle-store-module get --id <value>
```
