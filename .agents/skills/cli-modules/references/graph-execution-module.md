# graphExecutionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for GraphExecutionModule records via csdk CLI

## Usage

```bash
csdk graph-execution-module list
csdk graph-execution-module list --where.<field>.<op> <value> --orderBy <values>
csdk graph-execution-module list --limit 10 --after <cursor>
csdk graph-execution-module find-first --where.<field>.<op> <value>
csdk graph-execution-module get --id <UUID>
csdk graph-execution-module create --databaseId <UUID> --graphModuleId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--executionsTableId <UUID>] [--executionsTableName <String>] [--nodeStatesTableId <UUID>] [--nodeStatesTableName <String>] [--outputsTableId <UUID>] [--outputsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk graph-execution-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--executionsTableId <UUID>] [--executionsTableName <String>] [--graphModuleId <UUID>] [--nodeStatesTableId <UUID>] [--nodeStatesTableName <String>] [--outputsTableId <UUID>] [--outputsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk graph-execution-module delete --id <UUID>
```

## Examples

### List graphExecutionModule records

```bash
csdk graph-execution-module list
```

### List graphExecutionModule records with pagination

```bash
csdk graph-execution-module list --limit 10 --offset 0
```

### List graphExecutionModule records with cursor pagination

```bash
csdk graph-execution-module list --limit 10 --after <cursor>
```

### Find first matching graphExecutionModule

```bash
csdk graph-execution-module find-first --where.id.equalTo <value>
```

### List graphExecutionModule records with field selection

```bash
csdk graph-execution-module list --select id,id
```

### List graphExecutionModule records with filtering and ordering

```bash
csdk graph-execution-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a graphExecutionModule

```bash
csdk graph-execution-module create --databaseId <UUID> --graphModuleId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--executionsTableId <UUID>] [--executionsTableName <String>] [--nodeStatesTableId <UUID>] [--nodeStatesTableName <String>] [--outputsTableId <UUID>] [--outputsTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a graphExecutionModule by id

```bash
csdk graph-execution-module get --id <value>
```
