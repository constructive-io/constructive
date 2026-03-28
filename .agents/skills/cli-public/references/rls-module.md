# rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RlsModule records via csdk CLI

## Usage

```bash
csdk rls-module list
csdk rls-module list --where.<field>.<op> <value> --orderBy <values>
csdk rls-module list --limit 10 --after <cursor>
csdk rls-module find-first --where.<field>.<op> <value>
csdk rls-module get --id <UUID>
csdk rls-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
csdk rls-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
csdk rls-module delete --id <UUID>
```

## Examples

### List rlsModule records

```bash
csdk rls-module list
```

### List rlsModule records with pagination

```bash
csdk rls-module list --limit 10 --offset 0
```

### List rlsModule records with cursor pagination

```bash
csdk rls-module list --limit 10 --after <cursor>
```

### Find first matching rlsModule

```bash
csdk rls-module find-first --where.id.equalTo <value>
```

### List rlsModule records with field selection

```bash
csdk rls-module list --select id,id
```

### List rlsModule records with filtering and ordering

```bash
csdk rls-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a rlsModule

```bash
csdk rls-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
```

### Get a rlsModule by id

```bash
csdk rls-module get --id <value>
```
