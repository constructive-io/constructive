# infraConfigModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraConfigModule records via csdk CLI

## Usage

```bash
csdk infra-config-module list
csdk infra-config-module list --where.<field>.<op> <value> --orderBy <values>
csdk infra-config-module list --limit 10 --after <cursor>
csdk infra-config-module find-first --where.<field>.<op> <value>
csdk infra-config-module get --id <UUID>
csdk infra-config-module create --databaseId <UUID> [--apiName <String>] [--configTableId <UUID>] [--configTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk infra-config-module update --id <UUID> [--apiName <String>] [--configTableId <UUID>] [--configTableName <String>] [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk infra-config-module delete --id <UUID>
```

## Examples

### List infraConfigModule records

```bash
csdk infra-config-module list
```

### List infraConfigModule records with pagination

```bash
csdk infra-config-module list --limit 10 --offset 0
```

### List infraConfigModule records with cursor pagination

```bash
csdk infra-config-module list --limit 10 --after <cursor>
```

### Find first matching infraConfigModule

```bash
csdk infra-config-module find-first --where.id.equalTo <value>
```

### List infraConfigModule records with field selection

```bash
csdk infra-config-module list --select id,id
```

### List infraConfigModule records with filtering and ordering

```bash
csdk infra-config-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraConfigModule

```bash
csdk infra-config-module create --databaseId <UUID> [--apiName <String>] [--configTableId <UUID>] [--configTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a infraConfigModule by id

```bash
csdk infra-config-module get --id <value>
```
