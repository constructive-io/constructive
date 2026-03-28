# tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableTemplateModule records via csdk CLI

## Usage

```bash
csdk table-template-module list
csdk table-template-module list --where.<field>.<op> <value> --orderBy <values>
csdk table-template-module list --limit 10 --after <cursor>
csdk table-template-module find-first --where.<field>.<op> <value>
csdk table-template-module get --id <UUID>
csdk table-template-module create --databaseId <UUID> --tableName <String> --nodeType <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--data <JSON>]
csdk table-template-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>] [--nodeType <String>] [--data <JSON>]
csdk table-template-module delete --id <UUID>
```

## Examples

### List tableTemplateModule records

```bash
csdk table-template-module list
```

### List tableTemplateModule records with pagination

```bash
csdk table-template-module list --limit 10 --offset 0
```

### List tableTemplateModule records with cursor pagination

```bash
csdk table-template-module list --limit 10 --after <cursor>
```

### Find first matching tableTemplateModule

```bash
csdk table-template-module find-first --where.id.equalTo <value>
```

### List tableTemplateModule records with field selection

```bash
csdk table-template-module list --select id,id
```

### List tableTemplateModule records with filtering and ordering

```bash
csdk table-template-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a tableTemplateModule

```bash
csdk table-template-module create --databaseId <UUID> --tableName <String> --nodeType <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--data <JSON>]
```

### Get a tableTemplateModule by id

```bash
csdk table-template-module get --id <value>
```
