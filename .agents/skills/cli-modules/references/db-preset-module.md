# dbPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DbPresetModule records via csdk CLI

## Usage

```bash
csdk db-preset-module list
csdk db-preset-module list --where.<field>.<op> <value> --orderBy <values>
csdk db-preset-module list --limit 10 --after <cursor>
csdk db-preset-module find-first --where.<field>.<op> <value>
csdk db-preset-module get --id <UUID>
csdk db-preset-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--dbPresetsTableId <UUID>] [--entityTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
csdk db-preset-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--dbPresetsTableId <UUID>] [--entityTableId <UUID>] [--merkleStoreModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--scope <String>] [--storeName <String>]
csdk db-preset-module delete --id <UUID>
```

## Examples

### List dbPresetModule records

```bash
csdk db-preset-module list
```

### List dbPresetModule records with pagination

```bash
csdk db-preset-module list --limit 10 --offset 0
```

### List dbPresetModule records with cursor pagination

```bash
csdk db-preset-module list --limit 10 --after <cursor>
```

### Find first matching dbPresetModule

```bash
csdk db-preset-module find-first --where.id.equalTo <value>
```

### List dbPresetModule records with field selection

```bash
csdk db-preset-module list --select id,id
```

### List dbPresetModule records with filtering and ordering

```bash
csdk db-preset-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dbPresetModule

```bash
csdk db-preset-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--dbPresetsTableId <UUID>] [--entityTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
```

### Get a dbPresetModule by id

```bash
csdk db-preset-module get --id <value>
```
