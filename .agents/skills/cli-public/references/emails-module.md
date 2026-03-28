# emailsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmailsModule records via csdk CLI

## Usage

```bash
csdk emails-module list
csdk emails-module list --where.<field>.<op> <value> --orderBy <values>
csdk emails-module list --limit 10 --after <cursor>
csdk emails-module find-first --where.<field>.<op> <value>
csdk emails-module get --id <UUID>
csdk emails-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
csdk emails-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
csdk emails-module delete --id <UUID>
```

## Examples

### List emailsModule records

```bash
csdk emails-module list
```

### List emailsModule records with pagination

```bash
csdk emails-module list --limit 10 --offset 0
```

### List emailsModule records with cursor pagination

```bash
csdk emails-module list --limit 10 --after <cursor>
```

### Find first matching emailsModule

```bash
csdk emails-module find-first --where.id.equalTo <value>
```

### List emailsModule records with field selection

```bash
csdk emails-module list --select id,id
```

### List emailsModule records with filtering and ordering

```bash
csdk emails-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a emailsModule

```bash
csdk emails-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
```

### Get a emailsModule by id

```bash
csdk emails-module get --id <value>
```
