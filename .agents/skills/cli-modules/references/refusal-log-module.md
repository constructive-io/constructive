# refusalLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RefusalLogModule records via csdk CLI

## Usage

```bash
csdk refusal-log-module list
csdk refusal-log-module list --where.<field>.<op> <value> --orderBy <values>
csdk refusal-log-module list --limit 10 --after <cursor>
csdk refusal-log-module find-first --where.<field>.<op> <value>
csdk refusal-log-module get --id <UUID>
csdk refusal-log-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--entityField <String>] [--logInterval <String>] [--logPremake <Int>] [--logRetention <String>] [--logTableId <UUID>] [--logTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordRefusalsFunction <String>] [--rollupRefusalUsageSummaryFunction <String>] [--schemaId <UUID>] [--summaryInterval <String>] [--summaryPremake <Int>] [--summaryRetention <String>] [--summaryTableId <UUID>] [--summaryTableName <String>]
csdk refusal-log-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityField <String>] [--logInterval <String>] [--logPremake <Int>] [--logRetention <String>] [--logTableId <UUID>] [--logTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordRefusalsFunction <String>] [--rollupRefusalUsageSummaryFunction <String>] [--schemaId <UUID>] [--scope <String>] [--summaryInterval <String>] [--summaryPremake <Int>] [--summaryRetention <String>] [--summaryTableId <UUID>] [--summaryTableName <String>]
csdk refusal-log-module delete --id <UUID>
```

## Examples

### List refusalLogModule records

```bash
csdk refusal-log-module list
```

### List refusalLogModule records with pagination

```bash
csdk refusal-log-module list --limit 10 --offset 0
```

### List refusalLogModule records with cursor pagination

```bash
csdk refusal-log-module list --limit 10 --after <cursor>
```

### Find first matching refusalLogModule

```bash
csdk refusal-log-module find-first --where.id.equalTo <value>
```

### List refusalLogModule records with field selection

```bash
csdk refusal-log-module list --select id,id
```

### List refusalLogModule records with filtering and ordering

```bash
csdk refusal-log-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a refusalLogModule

```bash
csdk refusal-log-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--entityField <String>] [--logInterval <String>] [--logPremake <Int>] [--logRetention <String>] [--logTableId <UUID>] [--logTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--recordRefusalsFunction <String>] [--rollupRefusalUsageSummaryFunction <String>] [--schemaId <UUID>] [--summaryInterval <String>] [--summaryPremake <Int>] [--summaryRetention <String>] [--summaryTableId <UUID>] [--summaryTableName <String>]
```

### Get a refusalLogModule by id

```bash
csdk refusal-log-module get --id <value>
```
