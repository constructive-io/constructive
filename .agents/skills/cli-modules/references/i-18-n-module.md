# i18NModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for I18NModule records via csdk CLI

## Usage

```bash
csdk i-18-n-module list
csdk i-18-n-module list --where.<field>.<op> <value> --orderBy <values>
csdk i-18-n-module list --limit 10 --after <cursor>
csdk i-18-n-module find-first --where.<field>.<op> <value>
csdk i-18-n-module get --id <UUID>
csdk i-18-n-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--settingsTableId <UUID>] [--apiName <String>] [--privateApiName <String>]
csdk i-18-n-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--settingsTableId <UUID>] [--apiName <String>] [--privateApiName <String>]
csdk i-18-n-module delete --id <UUID>
```

## Examples

### List i18NModule records

```bash
csdk i-18-n-module list
```

### List i18NModule records with pagination

```bash
csdk i-18-n-module list --limit 10 --offset 0
```

### List i18NModule records with cursor pagination

```bash
csdk i-18-n-module list --limit 10 --after <cursor>
```

### Find first matching i18NModule

```bash
csdk i-18-n-module find-first --where.id.equalTo <value>
```

### List i18NModule records with field selection

```bash
csdk i-18-n-module list --select id,id
```

### List i18NModule records with filtering and ordering

```bash
csdk i-18-n-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a i18NModule

```bash
csdk i-18-n-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--settingsTableId <UUID>] [--apiName <String>] [--privateApiName <String>]
```

### Get a i18NModule by id

```bash
csdk i-18-n-module get --id <value>
```
