# configSecretsUserModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConfigSecretsUserModule records via csdk CLI

## Usage

```bash
csdk config-secrets-user-module list
csdk config-secrets-user-module list --where.<field>.<op> <value> --orderBy <values>
csdk config-secrets-user-module list --limit 10 --after <cursor>
csdk config-secrets-user-module find-first --where.<field>.<op> <value>
csdk config-secrets-user-module get --id <UUID>
csdk config-secrets-user-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk config-secrets-user-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk config-secrets-user-module delete --id <UUID>
```

## Examples

### List configSecretsUserModule records

```bash
csdk config-secrets-user-module list
```

### List configSecretsUserModule records with pagination

```bash
csdk config-secrets-user-module list --limit 10 --offset 0
```

### List configSecretsUserModule records with cursor pagination

```bash
csdk config-secrets-user-module list --limit 10 --after <cursor>
```

### Find first matching configSecretsUserModule

```bash
csdk config-secrets-user-module find-first --where.id.equalTo <value>
```

### List configSecretsUserModule records with field selection

```bash
csdk config-secrets-user-module list --select id,id
```

### List configSecretsUserModule records with filtering and ordering

```bash
csdk config-secrets-user-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a configSecretsUserModule

```bash
csdk config-secrets-user-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--privateApiName <String>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a configSecretsUserModule by id

```bash
csdk config-secrets-user-module get --id <value>
```
