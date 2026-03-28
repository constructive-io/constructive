# usersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UsersModule records via csdk CLI

## Usage

```bash
csdk users-module list
csdk users-module list --where.<field>.<op> <value> --orderBy <values>
csdk users-module list --limit 10 --after <cursor>
csdk users-module find-first --where.<field>.<op> <value>
csdk users-module get --id <UUID>
csdk users-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--typeTableId <UUID>] [--typeTableName <String>]
csdk users-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--typeTableId <UUID>] [--typeTableName <String>]
csdk users-module delete --id <UUID>
```

## Examples

### List usersModule records

```bash
csdk users-module list
```

### List usersModule records with pagination

```bash
csdk users-module list --limit 10 --offset 0
```

### List usersModule records with cursor pagination

```bash
csdk users-module list --limit 10 --after <cursor>
```

### Find first matching usersModule

```bash
csdk users-module find-first --where.id.equalTo <value>
```

### List usersModule records with field selection

```bash
csdk users-module list --select id,id
```

### List usersModule records with filtering and ordering

```bash
csdk users-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a usersModule

```bash
csdk users-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--typeTableId <UUID>] [--typeTableName <String>]
```

### Get a usersModule by id

```bash
csdk users-module get --id <value>
```
