# imageModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ImageModule records via csdk CLI

## Usage

```bash
csdk image-module list
csdk image-module list --where.<field>.<op> <value> --orderBy <values>
csdk image-module list --limit 10 --after <cursor>
csdk image-module find-first --where.<field>.<op> <value>
csdk image-module get --id <UUID>
csdk image-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--imageGrantsTableId <UUID>] [--imageGrantsTableName <String>] [--imagesTableId <UUID>] [--imagesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--registriesTableId <UUID>] [--registriesTableName <String>] [--registryGrantsTableId <UUID>] [--registryGrantsTableName <String>] [--schemaId <UUID>]
csdk image-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--imageGrantsTableId <UUID>] [--imageGrantsTableName <String>] [--imagesTableId <UUID>] [--imagesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--registriesTableId <UUID>] [--registriesTableName <String>] [--registryGrantsTableId <UUID>] [--registryGrantsTableName <String>] [--schemaId <UUID>] [--scope <String>]
csdk image-module delete --id <UUID>
```

## Examples

### List imageModule records

```bash
csdk image-module list
```

### List imageModule records with pagination

```bash
csdk image-module list --limit 10 --offset 0
```

### List imageModule records with cursor pagination

```bash
csdk image-module list --limit 10 --after <cursor>
```

### Find first matching imageModule

```bash
csdk image-module find-first --where.id.equalTo <value>
```

### List imageModule records with field selection

```bash
csdk image-module list --select id,id
```

### List imageModule records with filtering and ordering

```bash
csdk image-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a imageModule

```bash
csdk image-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--imageGrantsTableId <UUID>] [--imageGrantsTableName <String>] [--imagesTableId <UUID>] [--imagesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--registriesTableId <UUID>] [--registriesTableName <String>] [--registryGrantsTableId <UUID>] [--registryGrantsTableName <String>] [--schemaId <UUID>]
```

### Get a imageModule by id

```bash
csdk image-module get --id <value>
```
