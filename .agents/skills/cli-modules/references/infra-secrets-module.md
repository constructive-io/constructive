# infraSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraSecretsModule records via csdk CLI

## Usage

```bash
csdk infra-secrets-module list
csdk infra-secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk infra-secrets-module list --limit 10 --after <cursor>
csdk infra-secrets-module find-first --where.<field>.<op> <value>
csdk infra-secrets-module get --id <UUID>
csdk infra-secrets-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--secretsTableId <UUID>] [--secretsTableName <String>]
csdk infra-secrets-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--secretsTableId <UUID>] [--secretsTableName <String>]
csdk infra-secrets-module delete --id <UUID>
```

## Examples

### List infraSecretsModule records

```bash
csdk infra-secrets-module list
```

### List infraSecretsModule records with pagination

```bash
csdk infra-secrets-module list --limit 10 --offset 0
```

### List infraSecretsModule records with cursor pagination

```bash
csdk infra-secrets-module list --limit 10 --after <cursor>
```

### Find first matching infraSecretsModule

```bash
csdk infra-secrets-module find-first --where.id.equalTo <value>
```

### List infraSecretsModule records with field selection

```bash
csdk infra-secrets-module list --select id,id
```

### List infraSecretsModule records with filtering and ordering

```bash
csdk infra-secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraSecretsModule

```bash
csdk infra-secrets-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--secretsTableId <UUID>] [--secretsTableName <String>]
```

### Get a infraSecretsModule by id

```bash
csdk infra-secrets-module get --id <value>
```
