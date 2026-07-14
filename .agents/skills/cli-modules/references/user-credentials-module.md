# userCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserCredentialsModule records via csdk CLI

## Usage

```bash
csdk user-credentials-module list
csdk user-credentials-module list --where.<field>.<op> <value> --orderBy <values>
csdk user-credentials-module list --limit 10 --after <cursor>
csdk user-credentials-module find-first --where.<field>.<op> <value>
csdk user-credentials-module get --id <UUID>
csdk user-credentials-module create --databaseId <UUID> [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-credentials-module update --id <UUID> [--databaseId <UUID>] [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-credentials-module delete --id <UUID>
```

## Examples

### List userCredentialsModule records

```bash
csdk user-credentials-module list
```

### List userCredentialsModule records with pagination

```bash
csdk user-credentials-module list --limit 10 --offset 0
```

### List userCredentialsModule records with cursor pagination

```bash
csdk user-credentials-module list --limit 10 --after <cursor>
```

### Find first matching userCredentialsModule

```bash
csdk user-credentials-module find-first --where.id.equalTo <value>
```

### List userCredentialsModule records with field selection

```bash
csdk user-credentials-module list --select id,id
```

### List userCredentialsModule records with filtering and ordering

```bash
csdk user-credentials-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userCredentialsModule

```bash
csdk user-credentials-module create --databaseId <UUID> [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a userCredentialsModule by id

```bash
csdk user-credentials-module get --id <value>
```
