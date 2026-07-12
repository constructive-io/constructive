# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionModule records via csdk CLI

## Usage

```bash
csdk function-module list
csdk function-module list --where.<field>.<op> <value> --orderBy <values>
csdk function-module list --limit 10 --after <cursor>
csdk function-module find-first --where.<field>.<op> <value>
csdk function-module get --id <UUID>
csdk function-module create --databaseId <UUID> [--entityField <String>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--definitionsTableId <UUID>] [--definitionsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk function-module update --id <UUID> [--databaseId <UUID>] [--entityField <String>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--definitionsTableId <UUID>] [--definitionsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk function-module delete --id <UUID>
```

## Examples

### List functionModule records

```bash
csdk function-module list
```

### List functionModule records with pagination

```bash
csdk function-module list --limit 10 --offset 0
```

### List functionModule records with cursor pagination

```bash
csdk function-module list --limit 10 --after <cursor>
```

### Find first matching functionModule

```bash
csdk function-module find-first --where.id.equalTo <value>
```

### List functionModule records with field selection

```bash
csdk function-module list --select id,id
```

### List functionModule records with filtering and ordering

```bash
csdk function-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionModule

```bash
csdk function-module create --databaseId <UUID> [--entityField <String>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--definitionsTableId <UUID>] [--definitionsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a functionModule by id

```bash
csdk function-module get --id <value>
```
