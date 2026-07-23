# routeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RouteModule records via csdk CLI

## Usage

```bash
csdk route-module list
csdk route-module list --where.<field>.<op> <value> --orderBy <values>
csdk route-module list --limit 10 --after <cursor>
csdk route-module find-first --where.<field>.<op> <value>
csdk route-module get --id <UUID>
csdk route-module create --databaseId <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--domainModuleId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--hostnameBindingsTableId <UUID>] [--hostnameBindingsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--routeBindingsTableId <UUID>] [--routeBindingsTableName <String>] [--routesTableId <UUID>] [--routesTableName <String>] [--schemaId <UUID>] [--scope <String>]
csdk route-module update --id <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--databaseId <UUID>] [--defaultPermissions <String>] [--domainModuleId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--hostnameBindingsTableId <UUID>] [--hostnameBindingsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--routeBindingsTableId <UUID>] [--routeBindingsTableName <String>] [--routesTableId <UUID>] [--routesTableName <String>] [--schemaId <UUID>] [--scope <String>]
csdk route-module delete --id <UUID>
```

## Examples

### List routeModule records

```bash
csdk route-module list
```

### List routeModule records with pagination

```bash
csdk route-module list --limit 10 --offset 0
```

### List routeModule records with cursor pagination

```bash
csdk route-module list --limit 10 --after <cursor>
```

### Find first matching routeModule

```bash
csdk route-module find-first --where.id.equalTo <value>
```

### List routeModule records with field selection

```bash
csdk route-module list --select id,id
```

### List routeModule records with filtering and ordering

```bash
csdk route-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a routeModule

```bash
csdk route-module create --databaseId <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--domainModuleId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--hostnameBindingsTableId <UUID>] [--hostnameBindingsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resolverFunctionName <String>] [--routeBindingsTableId <UUID>] [--routeBindingsTableName <String>] [--routesTableId <UUID>] [--routesTableName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a routeModule by id

```bash
csdk route-module get --id <value>
```
