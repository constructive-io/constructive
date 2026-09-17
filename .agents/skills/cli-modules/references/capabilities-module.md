# capabilitiesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CapabilitiesModule records via csdk CLI

## Usage

```bash
csdk capabilities-module list
csdk capabilities-module list --where.<field>.<op> <value> --orderBy <values>
csdk capabilities-module list --limit 10 --after <cursor>
csdk capabilities-module find-first --where.<field>.<op> <value>
csdk capabilities-module get --id <UUID>
csdk capabilities-module create --databaseId <UUID> --scope <String> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk capabilities-module update --id <UUID> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--databaseId <UUID>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk capabilities-module delete --id <UUID>
```

## Examples

### List capabilitiesModule records

```bash
csdk capabilities-module list
```

### List capabilitiesModule records with pagination

```bash
csdk capabilities-module list --limit 10 --offset 0
```

### List capabilitiesModule records with cursor pagination

```bash
csdk capabilities-module list --limit 10 --after <cursor>
```

### Find first matching capabilitiesModule

```bash
csdk capabilities-module find-first --where.id.equalTo <value>
```

### List capabilitiesModule records with field selection

```bash
csdk capabilities-module list --select id,id
```

### List capabilitiesModule records with filtering and ordering

```bash
csdk capabilities-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a capabilitiesModule

```bash
csdk capabilities-module create --databaseId <UUID> --scope <String> [--actorTableId <UUID>] [--apiName <String>] [--bitlen <Int>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--getByMask <String>] [--getMask <String>] [--getMaskByName <String>] [--getPaddedMask <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a capabilitiesModule by id

```bash
csdk capabilities-module get --id <value>
```
