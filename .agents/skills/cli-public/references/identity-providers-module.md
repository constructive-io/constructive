# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for IdentityProvidersModule records via csdk CLI

## Usage

```bash
csdk identity-providers-module list
csdk identity-providers-module list --where.<field>.<op> <value> --orderBy <values>
csdk identity-providers-module list --limit 10 --after <cursor>
csdk identity-providers-module find-first --where.<field>.<op> <value>
csdk identity-providers-module get --id <UUID>
csdk identity-providers-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk identity-providers-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk identity-providers-module delete --id <UUID>
```

## Examples

### List identityProvidersModule records

```bash
csdk identity-providers-module list
```

### List identityProvidersModule records with pagination

```bash
csdk identity-providers-module list --limit 10 --offset 0
```

### List identityProvidersModule records with cursor pagination

```bash
csdk identity-providers-module list --limit 10 --after <cursor>
```

### Find first matching identityProvidersModule

```bash
csdk identity-providers-module find-first --where.id.equalTo <value>
```

### List identityProvidersModule records with field selection

```bash
csdk identity-providers-module list --select id,id
```

### List identityProvidersModule records with filtering and ordering

```bash
csdk identity-providers-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a identityProvidersModule

```bash
csdk identity-providers-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a identityProvidersModule by id

```bash
csdk identity-providers-module get --id <value>
```
