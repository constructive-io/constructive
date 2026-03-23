# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ProfilesModule records via csdk CLI

## Usage

```bash
csdk profiles-module list
csdk profiles-module get --id <UUID>
csdk profiles-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--permissionsTableId <UUID>] [--membershipsTableId <UUID>] [--prefix <String>]
csdk profiles-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--membershipType <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--permissionsTableId <UUID>] [--membershipsTableId <UUID>] [--prefix <String>]
csdk profiles-module delete --id <UUID>
```

## Examples

### List all profilesModule records

```bash
csdk profiles-module list
```

### Create a profilesModule

```bash
csdk profiles-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--entityTableId <UUID>] [--actorTableId <UUID>] [--permissionsTableId <UUID>] [--membershipsTableId <UUID>] [--prefix <String>]
```

### Get a profilesModule by id

```bash
csdk profiles-module get --id <value>
```
