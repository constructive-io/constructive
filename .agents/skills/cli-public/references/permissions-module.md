# permissionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PermissionsModule records via csdk CLI

## Usage

```bash
csdk permissions-module list
csdk permissions-module get --id <UUID>
csdk permissions-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--bitlen <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--prefix <String>] [--getPaddedMask <String>] [--getMask <String>] [--getByMask <String>] [--getMaskByName <String>]
csdk permissions-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--bitlen <Int>] [--membershipType <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--prefix <String>] [--getPaddedMask <String>] [--getMask <String>] [--getByMask <String>] [--getMaskByName <String>]
csdk permissions-module delete --id <UUID>
```

## Examples

### List all permissionsModule records

```bash
csdk permissions-module list
```

### Create a permissionsModule

```bash
csdk permissions-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--bitlen <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--prefix <String>] [--getPaddedMask <String>] [--getMask <String>] [--getByMask <String>] [--getMaskByName <String>]
```

### Get a permissionsModule by id

```bash
csdk permissions-module get --id <value>
```
