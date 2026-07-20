# appModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppModule records via csdk CLI

## Usage

```bash
csdk app-module list
csdk app-module list --where.<field>.<op> <value> --orderBy <values>
csdk app-module list --limit 10 --after <cursor>
csdk app-module find-first --where.<field>.<op> <value>
csdk app-module get --id <UUID>
csdk app-module create --databaseId <UUID> [--apiName <String>] [--appMembersTableId <UUID>] [--appMembersTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk app-module update --id <UUID> [--apiName <String>] [--appMembersTableId <UUID>] [--appMembersTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--catalogModuleId <UUID>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk app-module delete --id <UUID>
```

## Examples

### List appModule records

```bash
csdk app-module list
```

### List appModule records with pagination

```bash
csdk app-module list --limit 10 --offset 0
```

### List appModule records with cursor pagination

```bash
csdk app-module list --limit 10 --after <cursor>
```

### Find first matching appModule

```bash
csdk app-module find-first --where.id.equalTo <value>
```

### List appModule records with field selection

```bash
csdk app-module list --select id,id
```

### List appModule records with filtering and ordering

```bash
csdk app-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appModule

```bash
csdk app-module create --databaseId <UUID> [--apiName <String>] [--appMembersTableId <UUID>] [--appMembersTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a appModule by id

```bash
csdk app-module get --id <value>
```
