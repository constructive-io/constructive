# contentPresetModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ContentPresetModule records via csdk CLI

## Usage

```bash
csdk content-preset-module list
csdk content-preset-module list --where.<field>.<op> <value> --orderBy <values>
csdk content-preset-module list --limit 10 --after <cursor>
csdk content-preset-module find-first --where.<field>.<op> <value>
csdk content-preset-module get --id <UUID>
csdk content-preset-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--contentPresetsTableId <UUID>] [--entityTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
csdk content-preset-module update --id <UUID> [--apiName <String>] [--contentPresetsTableId <UUID>] [--databaseId <UUID>] [--entityTableId <UUID>] [--merkleStoreModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--scope <String>] [--storeName <String>]
csdk content-preset-module delete --id <UUID>
```

## Examples

### List contentPresetModule records

```bash
csdk content-preset-module list
```

### List contentPresetModule records with pagination

```bash
csdk content-preset-module list --limit 10 --offset 0
```

### List contentPresetModule records with cursor pagination

```bash
csdk content-preset-module list --limit 10 --after <cursor>
```

### Find first matching contentPresetModule

```bash
csdk content-preset-module find-first --where.id.equalTo <value>
```

### List contentPresetModule records with field selection

```bash
csdk content-preset-module list --select id,id
```

### List contentPresetModule records with filtering and ordering

```bash
csdk content-preset-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a contentPresetModule

```bash
csdk content-preset-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--contentPresetsTableId <UUID>] [--entityTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
```

### Get a contentPresetModule by id

```bash
csdk content-preset-module get --id <value>
```
