# integrationProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for IntegrationProvidersModule records via csdk CLI

## Usage

```bash
csdk integration-providers-module list
csdk integration-providers-module list --where.<field>.<op> <value> --orderBy <values>
csdk integration-providers-module list --limit 10 --after <cursor>
csdk integration-providers-module find-first --where.<field>.<op> <value>
csdk integration-providers-module get --id <UUID>
csdk integration-providers-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk integration-providers-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk integration-providers-module delete --id <UUID>
```

## Examples

### List integrationProvidersModule records

```bash
csdk integration-providers-module list
```

### List integrationProvidersModule records with pagination

```bash
csdk integration-providers-module list --limit 10 --offset 0
```

### List integrationProvidersModule records with cursor pagination

```bash
csdk integration-providers-module list --limit 10 --after <cursor>
```

### Find first matching integrationProvidersModule

```bash
csdk integration-providers-module find-first --where.id.equalTo <value>
```

### List integrationProvidersModule records with field selection

```bash
csdk integration-providers-module list --select id,id
```

### List integrationProvidersModule records with filtering and ordering

```bash
csdk integration-providers-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a integrationProvidersModule

```bash
csdk integration-providers-module create --databaseId <UUID> [--apiName <String>] [--entityField <String>] [--entityTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
```

### Get a integrationProvidersModule by id

```bash
csdk integration-providers-module get --id <value>
```
