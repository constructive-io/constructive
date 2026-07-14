# profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ProfilesModule records via csdk CLI

## Usage

```bash
csdk profiles-module list
csdk profiles-module list --where.<field>.<op> <value> --orderBy <values>
csdk profiles-module list --limit 10 --after <cursor>
csdk profiles-module find-first --where.<field>.<op> <value>
csdk profiles-module get --id <UUID>
csdk profiles-module create --databaseId <UUID> [--actorTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--membershipsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileTemplatesTableId <UUID>] [--profileTemplatesTableName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk profiles-module update --id <UUID> [--actorTableId <UUID>] [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--membershipsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileTemplatesTableId <UUID>] [--profileTemplatesTableName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk profiles-module delete --id <UUID>
```

## Examples

### List profilesModule records

```bash
csdk profiles-module list
```

### List profilesModule records with pagination

```bash
csdk profiles-module list --limit 10 --offset 0
```

### List profilesModule records with cursor pagination

```bash
csdk profiles-module list --limit 10 --after <cursor>
```

### Find first matching profilesModule

```bash
csdk profiles-module find-first --where.id.equalTo <value>
```

### List profilesModule records with field selection

```bash
csdk profiles-module list --select id,id
```

### List profilesModule records with filtering and ordering

```bash
csdk profiles-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a profilesModule

```bash
csdk profiles-module create --databaseId <UUID> [--actorTableId <UUID>] [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--membershipsTableId <UUID>] [--permissionsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--profileDefinitionGrantsTableId <UUID>] [--profileDefinitionGrantsTableName <String>] [--profileGrantsTableId <UUID>] [--profileGrantsTableName <String>] [--profilePermissionsTableId <UUID>] [--profilePermissionsTableName <String>] [--profileTemplatesTableId <UUID>] [--profileTemplatesTableName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
```

### Get a profilesModule by id

```bash
csdk profiles-module get --id <value>
```
