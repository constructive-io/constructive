# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PermissionsModule records via csdk CLI

## Usage

```bash
csdk permissions-module list
csdk permissions-module list --where.<field>.<op> <value> --orderBy <values>
csdk permissions-module list --limit 10 --after <cursor>
csdk permissions-module find-first --where.<field>.<op> <value>
csdk permissions-module get --id <UUID>
csdk permissions-module create --databaseId <UUID> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk permissions-module update --id <UUID> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--databaseId <UUID>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk permissions-module delete --id <UUID>
```

## Examples

### List permissionsModule records

```bash
csdk permissions-module list
```

### List permissionsModule records with pagination

```bash
csdk permissions-module list --limit 10 --offset 0
```

### List permissionsModule records with cursor pagination

```bash
csdk permissions-module list --limit 10 --after <cursor>
```

### Find first matching permissionsModule

```bash
csdk permissions-module find-first --where.id.equalTo <value>
```

### List permissionsModule records with field selection

```bash
csdk permissions-module list --select id,id
```

### List permissionsModule records with filtering and ordering

```bash
csdk permissions-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a permissionsModule

```bash
csdk permissions-module create --databaseId <UUID> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
```

### Get a permissionsModule by id

```bash
csdk permissions-module get --id <value>
```
