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
csdk graph-execution-module create --databaseId <UUID> --graphModuleId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--scope <String>] [--prefix <String>] [--executionsTableId <UUID>] [--outputsTableId <UUID>] [--nodeStatesTableId <UUID>] [--executionsTableName <String>] [--outputsTableName <String>] [--nodeStatesTableName <String>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk graph-execution-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--graphModuleId <UUID>] [--scope <String>] [--prefix <String>] [--executionsTableId <UUID>] [--outputsTableId <UUID>] [--nodeStatesTableId <UUID>] [--executionsTableName <String>] [--outputsTableName <String>] [--nodeStatesTableName <String>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
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
csdk graph-execution-module create --databaseId <UUID> --graphModuleId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--scope <String>] [--prefix <String>] [--executionsTableId <UUID>] [--outputsTableId <UUID>] [--nodeStatesTableId <UUID>] [--executionsTableName <String>] [--outputsTableName <String>] [--nodeStatesTableName <String>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a graphExecutionModule by id

```bash
csdk graph-execution-module get --id <value>
```
