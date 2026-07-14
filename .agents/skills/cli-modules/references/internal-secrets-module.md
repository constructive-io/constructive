# internalSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InternalSecretsModule records via csdk CLI

## Usage

```bash
csdk internal-secrets-module list
csdk internal-secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk internal-secrets-module list --limit 10 --after <cursor>
csdk internal-secrets-module find-first --where.<field>.<op> <value>
csdk internal-secrets-module get --id <UUID>
csdk internal-secrets-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--internalSecretsTableId <UUID>] [--internalSecretsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk internal-secrets-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--internalSecretsTableId <UUID>] [--internalSecretsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk internal-secrets-module delete --id <UUID>
```

## Examples

### List internalSecretsModule records

```bash
csdk internal-secrets-module list
```

### List internalSecretsModule records with pagination

```bash
csdk internal-secrets-module list --limit 10 --offset 0
```

### List internalSecretsModule records with cursor pagination

```bash
csdk internal-secrets-module list --limit 10 --after <cursor>
```

### Find first matching internalSecretsModule

```bash
csdk internal-secrets-module find-first --where.id.equalTo <value>
```

### List internalSecretsModule records with field selection

```bash
csdk internal-secrets-module list --select id,id
```

### List internalSecretsModule records with filtering and ordering

```bash
csdk internal-secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a internalSecretsModule

```bash
csdk internal-secrets-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--internalSecretsTableId <UUID>] [--internalSecretsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a internalSecretsModule by id

```bash
csdk internal-secrets-module get --id <value>
```
