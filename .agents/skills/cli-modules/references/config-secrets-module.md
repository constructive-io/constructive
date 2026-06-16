# configSecretsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConfigSecretsModule records via csdk CLI

## Usage

```bash
csdk config-secrets-module list
csdk config-secrets-module list --where.<field>.<op> <value> --orderBy <values>
csdk config-secrets-module list --limit 10 --after <cursor>
csdk config-secrets-module find-first --where.<field>.<op> <value>
csdk config-secrets-module get --id <UUID>
csdk config-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--tableId <UUID>] [--configDefinitionsTableId <UUID>] [--tableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--hasConfig <Boolean>]
csdk config-secrets-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--tableId <UUID>] [--configDefinitionsTableId <UUID>] [--tableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--hasConfig <Boolean>]
csdk config-secrets-module delete --id <UUID>
```

## Examples

### List configSecretsModule records

```bash
csdk config-secrets-module list
```

### List configSecretsModule records with pagination

```bash
csdk config-secrets-module list --limit 10 --offset 0
```

### List configSecretsModule records with cursor pagination

```bash
csdk config-secrets-module list --limit 10 --after <cursor>
```

### Find first matching configSecretsModule

```bash
csdk config-secrets-module find-first --where.id.equalTo <value>
```

### List configSecretsModule records with field selection

```bash
csdk config-secrets-module list --select id,id
```

### List configSecretsModule records with filtering and ordering

```bash
csdk config-secrets-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a configSecretsModule

```bash
csdk config-secrets-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--tableId <UUID>] [--configDefinitionsTableId <UUID>] [--tableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--hasConfig <Boolean>]
```

### Get a configSecretsModule by id

```bash
csdk config-secrets-module get --id <value>
```
