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
csdk limits-module create --databaseId <UUID> [--actorTableId <UUID>] [--aggregateTableId <UUID>] [--apiName <String>] [--capCheckTrigger <String>] [--creditCodeItemsTableId <UUID>] [--creditCodesTableId <UUID>] [--creditRedemptionsTableId <UUID>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventsTableId <UUID>] [--limitAggregateCheckSoftFunction <String>] [--limitCapsDefaultsTableId <UUID>] [--limitCapsTableId <UUID>] [--limitCheckFunction <String>] [--limitCheckSoftFunction <String>] [--limitCreditsTableId <UUID>] [--limitDecrementFunction <String>] [--limitDecrementTrigger <String>] [--limitIncrementFunction <String>] [--limitIncrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitWarningStateTableId <UUID>] [--limitWarningsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--resolveCapFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
csdk limits-module update --id <UUID> [--actorTableId <UUID>] [--aggregateTableId <UUID>] [--apiName <String>] [--capCheckTrigger <String>] [--creditCodeItemsTableId <UUID>] [--creditCodesTableId <UUID>] [--creditRedemptionsTableId <UUID>] [--databaseId <UUID>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventsTableId <UUID>] [--limitAggregateCheckSoftFunction <String>] [--limitCapsDefaultsTableId <UUID>] [--limitCapsTableId <UUID>] [--limitCheckFunction <String>] [--limitCheckSoftFunction <String>] [--limitCreditsTableId <UUID>] [--limitDecrementFunction <String>] [--limitDecrementTrigger <String>] [--limitIncrementFunction <String>] [--limitIncrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitWarningStateTableId <UUID>] [--limitWarningsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--resolveCapFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
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
csdk limits-module create --databaseId <UUID> [--actorTableId <UUID>] [--aggregateTableId <UUID>] [--apiName <String>] [--capCheckTrigger <String>] [--creditCodeItemsTableId <UUID>] [--creditCodesTableId <UUID>] [--creditRedemptionsTableId <UUID>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventsTableId <UUID>] [--limitAggregateCheckSoftFunction <String>] [--limitCapsDefaultsTableId <UUID>] [--limitCapsTableId <UUID>] [--limitCheckFunction <String>] [--limitCheckSoftFunction <String>] [--limitCreditsTableId <UUID>] [--limitDecrementFunction <String>] [--limitDecrementTrigger <String>] [--limitIncrementFunction <String>] [--limitIncrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitWarningStateTableId <UUID>] [--limitWarningsTableId <UUID>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--resolveCapFunction <String>] [--schemaId <UUID>] [--scope <String>] [--tableId <UUID>] [--tableName <String>]
```

### Get a limitsModule by id

```bash
csdk limits-module get --id <value>
```
