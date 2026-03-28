# secretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SecretsModule records via csdk CLI

## Usage

```bash
csdk secrets-module list
csdk secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk secrets-module list --limit 10 --after <cursor>
csdk secrets-module find-first --where.<field>.<op> <value>
csdk secrets-module get --id <UUID>
csdk secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk secrets-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk secrets-module delete --id <UUID>
```

## Examples

### List secretsModule records

```bash
csdk secrets-module list
```

### List secretsModule records with pagination

```bash
csdk secrets-module list --limit 10 --offset 0
```

### List secretsModule records with cursor pagination

```bash
csdk secrets-module list --limit 10 --after <cursor>
```

### Find first matching secretsModule

```bash
csdk secrets-module find-first --where.id.equalTo <value>
```

### List secretsModule records with field selection

```bash
csdk secrets-module list --select id,id
```

### List secretsModule records with filtering and ordering

```bash
csdk secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a secretsModule

```bash
csdk secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a secretsModule by id

```bash
csdk secrets-module get --id <value>
```
