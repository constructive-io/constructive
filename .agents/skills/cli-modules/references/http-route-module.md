# httpRouteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for HttpRouteModule records via csdk CLI

## Usage

```bash
csdk http-route-module list
csdk http-route-module list --where.<field>.<op> <value> --orderBy <values>
csdk http-route-module list --limit 10 --after <cursor>
csdk http-route-module find-first --where.<field>.<op> <value>
csdk http-route-module get --id <UUID>
csdk http-route-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--httpRoutesTableId <UUID>] [--httpRoutesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--resourceModuleId <UUID>] [--schemaId <UUID>] [--scope <String>] [--storageModuleId <UUID>]
csdk http-route-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--httpRoutesTableId <UUID>] [--httpRoutesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--resourceModuleId <UUID>] [--schemaId <UUID>] [--scope <String>] [--storageModuleId <UUID>]
csdk http-route-module delete --id <UUID>
```

## Examples

### List httpRouteModule records

```bash
csdk http-route-module list
```

### List httpRouteModule records with pagination

```bash
csdk http-route-module list --limit 10 --offset 0
```

### List httpRouteModule records with cursor pagination

```bash
csdk http-route-module list --limit 10 --after <cursor>
```

### Find first matching httpRouteModule

```bash
csdk http-route-module find-first --where.id.equalTo <value>
```

### List httpRouteModule records with field selection

```bash
csdk http-route-module list --select id,id
```

### List httpRouteModule records with filtering and ordering

```bash
csdk http-route-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a httpRouteModule

```bash
csdk http-route-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--httpRoutesTableId <UUID>] [--httpRoutesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--resourceModuleId <UUID>] [--schemaId <UUID>] [--scope <String>] [--storageModuleId <UUID>]
```

### Get a httpRouteModule by id

```bash
csdk http-route-module get --id <value>
```
