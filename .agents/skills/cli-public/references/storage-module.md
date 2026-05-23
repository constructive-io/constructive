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
csdk storage-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--membershipType <Int>] [--storageKey <String>] [--policies <JSON>] [--skipDefaultPolicyTables <String>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--restrictReads <Boolean>] [--hasPathShares <Boolean>] [--pathSharesTableId <UUID>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>] [--maxBulkFiles <Int>] [--maxBulkTotalSize <BigInt>] [--hasVersioning <Boolean>] [--hasContentHash <Boolean>] [--hasCustomKeys <Boolean>] [--hasAuditLog <Boolean>] [--hasConfirmUpload <Boolean>] [--confirmUploadDelay <Interval>] [--fileEventsTableId <UUID>]
csdk storage-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--membershipType <Int>] [--storageKey <String>] [--policies <JSON>] [--skipDefaultPolicyTables <String>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--restrictReads <Boolean>] [--hasPathShares <Boolean>] [--pathSharesTableId <UUID>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>] [--maxBulkFiles <Int>] [--maxBulkTotalSize <BigInt>] [--hasVersioning <Boolean>] [--hasContentHash <Boolean>] [--hasCustomKeys <Boolean>] [--hasAuditLog <Boolean>] [--hasConfirmUpload <Boolean>] [--confirmUploadDelay <Interval>] [--fileEventsTableId <UUID>]
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
csdk storage-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--bucketsTableId <UUID>] [--filesTableId <UUID>] [--bucketsTableName <String>] [--filesTableName <String>] [--membershipType <Int>] [--storageKey <String>] [--policies <JSON>] [--skipDefaultPolicyTables <String>] [--entityTableId <UUID>] [--endpoint <String>] [--publicUrlPrefix <String>] [--provider <String>] [--allowedOrigins <String>] [--restrictReads <Boolean>] [--hasPathShares <Boolean>] [--pathSharesTableId <UUID>] [--uploadUrlExpirySeconds <Int>] [--downloadUrlExpirySeconds <Int>] [--defaultMaxFileSize <BigInt>] [--maxFilenameLength <Int>] [--cacheTtlSeconds <Int>] [--maxBulkFiles <Int>] [--maxBulkTotalSize <BigInt>] [--hasVersioning <Boolean>] [--hasContentHash <Boolean>] [--hasCustomKeys <Boolean>] [--hasAuditLog <Boolean>] [--hasConfirmUpload <Boolean>] [--confirmUploadDelay <Interval>] [--fileEventsTableId <UUID>]
```

### Get a storageModule by id

```bash
csdk storage-module get --id <value>
```
