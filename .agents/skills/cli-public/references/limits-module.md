# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for LimitsModule records via csdk CLI

## Usage

```bash
csdk limits-module list
csdk limits-module list --where.<field>.<op> <value> --orderBy <values>
csdk limits-module list --limit 10 --after <cursor>
csdk limits-module find-first --where.<field>.<op> <value>
csdk limits-module get --id <UUID>
csdk limits-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk limits-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--membershipType <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk limits-module delete --id <UUID>
```

## Examples

### List limitsModule records

```bash
csdk limits-module list
```

### List limitsModule records with pagination

```bash
csdk limits-module list --limit 10 --offset 0
```

### List limitsModule records with cursor pagination

```bash
csdk limits-module list --limit 10 --after <cursor>
```

### Find first matching limitsModule

```bash
csdk limits-module find-first --where.id.equalTo <value>
```

### List limitsModule records with field selection

```bash
csdk limits-module list --select id,id
```

### List limitsModule records with filtering and ordering

```bash
csdk limits-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a limitsModule

```bash
csdk limits-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
```

### Get a limitsModule by id

```bash
csdk limits-module get --id <value>
```
