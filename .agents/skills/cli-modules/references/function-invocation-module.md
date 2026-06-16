# functionInvocationModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionInvocationModule records via csdk CLI

## Usage

```bash
csdk function-invocation-module list
csdk function-invocation-module list --where.<field>.<op> <value> --orderBy <values>
csdk function-invocation-module list --limit 10 --after <cursor>
csdk function-invocation-module find-first --where.<field>.<op> <value>
csdk function-invocation-module get --id <UUID>
csdk function-invocation-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--invocationsTableId <UUID>] [--executionLogsTableId <UUID>] [--invocationsTableName <String>] [--executionLogsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk function-invocation-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--invocationsTableId <UUID>] [--executionLogsTableId <UUID>] [--invocationsTableName <String>] [--executionLogsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk function-invocation-module delete --id <UUID>
```

## Examples

### List functionInvocationModule records

```bash
csdk function-invocation-module list
```

### List functionInvocationModule records with pagination

```bash
csdk function-invocation-module list --limit 10 --offset 0
```

### List functionInvocationModule records with cursor pagination

```bash
csdk function-invocation-module list --limit 10 --after <cursor>
```

### Find first matching functionInvocationModule

```bash
csdk function-invocation-module find-first --where.id.equalTo <value>
```

### List functionInvocationModule records with field selection

```bash
csdk function-invocation-module list --select id,id
```

### List functionInvocationModule records with filtering and ordering

```bash
csdk function-invocation-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionInvocationModule

```bash
csdk function-invocation-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--invocationsTableId <UUID>] [--executionLogsTableId <UUID>] [--invocationsTableName <String>] [--executionLogsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a functionInvocationModule by id

```bash
csdk function-invocation-module get --id <value>
```
