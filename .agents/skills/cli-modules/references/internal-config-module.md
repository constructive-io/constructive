# internalConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InternalConfigModule records via csdk CLI

## Usage

```bash
csdk internal-config-module list
csdk internal-config-module list --where.<field>.<op> <value> --orderBy <values>
csdk internal-config-module list --limit 10 --after <cursor>
csdk internal-config-module find-first --where.<field>.<op> <value>
csdk internal-config-module get --id <UUID>
csdk internal-config-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--internalConfigTableId <UUID>] [--internalConfigTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>]
csdk internal-config-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--internalConfigTableId <UUID>] [--internalConfigTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk internal-config-module delete --id <UUID>
```

## Examples

### List internalConfigModule records

```bash
csdk internal-config-module list
```

### List internalConfigModule records with pagination

```bash
csdk internal-config-module list --limit 10 --offset 0
```

### List internalConfigModule records with cursor pagination

```bash
csdk internal-config-module list --limit 10 --after <cursor>
```

### Find first matching internalConfigModule

```bash
csdk internal-config-module find-first --where.id.equalTo <value>
```

### List internalConfigModule records with field selection

```bash
csdk internal-config-module list --select id,id
```

### List internalConfigModule records with filtering and ordering

```bash
csdk internal-config-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a internalConfigModule

```bash
csdk internal-config-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--internalConfigTableId <UUID>] [--internalConfigTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>]
```

### Get a internalConfigModule by id

```bash
csdk internal-config-module get --id <value>
```
