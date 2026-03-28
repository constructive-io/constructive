# encryptedSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EncryptedSecretsModule records via csdk CLI

## Usage

```bash
csdk encrypted-secrets-module list
csdk encrypted-secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk encrypted-secrets-module list --limit 10 --after <cursor>
csdk encrypted-secrets-module find-first --where.<field>.<op> <value>
csdk encrypted-secrets-module get --id <UUID>
csdk encrypted-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk encrypted-secrets-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk encrypted-secrets-module delete --id <UUID>
```

## Examples

### List encryptedSecretsModule records

```bash
csdk encrypted-secrets-module list
```

### List encryptedSecretsModule records with pagination

```bash
csdk encrypted-secrets-module list --limit 10 --offset 0
```

### List encryptedSecretsModule records with cursor pagination

```bash
csdk encrypted-secrets-module list --limit 10 --after <cursor>
```

### Find first matching encryptedSecretsModule

```bash
csdk encrypted-secrets-module find-first --where.id.equalTo <value>
```

### List encryptedSecretsModule records with field selection

```bash
csdk encrypted-secrets-module list --select id,id
```

### List encryptedSecretsModule records with filtering and ordering

```bash
csdk encrypted-secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a encryptedSecretsModule

```bash
csdk encrypted-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a encryptedSecretsModule by id

```bash
csdk encrypted-secrets-module get --id <value>
```
