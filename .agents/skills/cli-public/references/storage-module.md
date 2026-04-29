# storageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for StorageModule records via csdk CLI

## Usage

```bash
csdk storage-module list
csdk storage-module list --where.<field>.<op> <value> --orderBy <values>
csdk storage-module list --limit 10 --after <cursor>
csdk storage-module find-first --where.<field>.<op> <value>
csdk storage-module get --id <UUID>
csdk storage-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--uploadRequestsTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--uploadRequestsTableName <String>] [--membershipType <Int>] [--policies <JSON>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>]
csdk storage-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--uploadRequestsTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--uploadRequestsTableName <String>] [--membershipType <Int>] [--policies <JSON>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>]
csdk storage-module delete --id <UUID>
```

## Examples

### List storageModule records

```bash
csdk storage-module list
```

### List storageModule records with pagination

```bash
csdk storage-module list --limit 10 --offset 0
```

### List storageModule records with cursor pagination

```bash
csdk storage-module list --limit 10 --after <cursor>
```

### Find first matching storageModule

```bash
csdk storage-module find-first --where.id.equalTo <value>
```

### List storageModule records with field selection

```bash
csdk storage-module list --select id,id
```

### List storageModule records with filtering and ordering

```bash
csdk storage-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a storageModule

```bash
csdk storage-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--uploadRequestsTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--uploadRequestsTableName <String>] [--membershipType <Int>] [--policies <JSON>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>]
```

### Get a storageModule by id

```bash
csdk storage-module get --id <value>
```
