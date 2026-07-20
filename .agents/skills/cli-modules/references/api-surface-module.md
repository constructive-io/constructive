# apiSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ApiSurfaceModule records via csdk CLI

## Usage

```bash
csdk api-surface-module list
csdk api-surface-module list --where.<field>.<op> <value> --orderBy <values>
csdk api-surface-module list --limit 10 --after <cursor>
csdk api-surface-module find-first --where.<field>.<op> <value>
csdk api-surface-module get --id <UUID>
csdk api-surface-module create --databaseId <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk api-surface-module update --id <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--catalogModuleId <UUID>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk api-surface-module delete --id <UUID>
```

## Examples

### List apiSurfaceModule records

```bash
csdk api-surface-module list
```

### List apiSurfaceModule records with pagination

```bash
csdk api-surface-module list --limit 10 --offset 0
```

### List apiSurfaceModule records with cursor pagination

```bash
csdk api-surface-module list --limit 10 --after <cursor>
```

### Find first matching apiSurfaceModule

```bash
csdk api-surface-module find-first --where.id.equalTo <value>
```

### List apiSurfaceModule records with field selection

```bash
csdk api-surface-module list --select id,id
```

### List apiSurfaceModule records with filtering and ordering

```bash
csdk api-surface-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a apiSurfaceModule

```bash
csdk api-surface-module create --databaseId <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a apiSurfaceModule by id

```bash
csdk api-surface-module get --id <value>
```
