# pagesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PagesModule records via csdk CLI

## Usage

```bash
csdk pages-module list
csdk pages-module list --where.<field>.<op> <value> --orderBy <values>
csdk pages-module list --limit 10 --after <cursor>
csdk pages-module find-first --where.<field>.<op> <value>
csdk pages-module get --id <UUID>
csdk pages-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> [--apiName <String>] [--entityTableId <UUID>] [--pagesTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--siteSurfaceModuleId <UUID>] [--sitesTableId <UUID>] [--storeNamePrefix <String>]
csdk pages-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityTableId <UUID>] [--merkleStoreModuleId <UUID>] [--pagesTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--scope <String>] [--siteSurfaceModuleId <UUID>] [--sitesTableId <UUID>] [--storeNamePrefix <String>]
csdk pages-module delete --id <UUID>
```

## Examples

### List pagesModule records

```bash
csdk pages-module list
```

### List pagesModule records with pagination

```bash
csdk pages-module list --limit 10 --offset 0
```

### List pagesModule records with cursor pagination

```bash
csdk pages-module list --limit 10 --after <cursor>
```

### Find first matching pagesModule

```bash
csdk pages-module find-first --where.id.equalTo <value>
```

### List pagesModule records with field selection

```bash
csdk pages-module list --select id,id
```

### List pagesModule records with filtering and ordering

```bash
csdk pages-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a pagesModule

```bash
csdk pages-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> [--apiName <String>] [--entityTableId <UUID>] [--pagesTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--siteSurfaceModuleId <UUID>] [--sitesTableId <UUID>] [--storeNamePrefix <String>]
```

### Get a pagesModule by id

```bash
csdk pages-module get --id <value>
```
