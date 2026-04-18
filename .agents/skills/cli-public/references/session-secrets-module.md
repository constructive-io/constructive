# sessionSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SessionSecretsModule records via csdk CLI

## Usage

```bash
csdk session-secrets-module list
csdk session-secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk session-secrets-module list --limit 10 --after <cursor>
csdk session-secrets-module find-first --where.<field>.<op> <value>
csdk session-secrets-module get --id <UUID>
csdk session-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--sessionsTableId <UUID>]
csdk session-secrets-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--sessionsTableId <UUID>]
csdk session-secrets-module delete --id <UUID>
```

## Examples

### List sessionSecretsModule records

```bash
csdk session-secrets-module list
```

### List sessionSecretsModule records with pagination

```bash
csdk session-secrets-module list --limit 10 --offset 0
```

### List sessionSecretsModule records with cursor pagination

```bash
csdk session-secrets-module list --limit 10 --after <cursor>
```

### Find first matching sessionSecretsModule

```bash
csdk session-secrets-module find-first --where.id.equalTo <value>
```

### List sessionSecretsModule records with field selection

```bash
csdk session-secrets-module list --select id,id
```

### List sessionSecretsModule records with filtering and ordering

```bash
csdk session-secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a sessionSecretsModule

```bash
csdk session-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--sessionsTableId <UUID>]
```

### Get a sessionSecretsModule by id

```bash
csdk session-secrets-module get --id <value>
```
