# databaseFunctionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseFunctionGraphExecutionOutput records via csdk CLI

## Usage

```bash
csdk database-function-graph-execution-output list
csdk database-function-graph-execution-output list --where.<field>.<op> <value> --orderBy <values>
csdk database-function-graph-execution-output list --limit 10 --after <cursor>
csdk database-function-graph-execution-output find-first --where.<field>.<op> <value>
csdk database-function-graph-execution-output get --id <UUID>
csdk database-function-graph-execution-output create --data <JSON> --databaseId <UUID> --hash <Base64EncodedBinary>
csdk database-function-graph-execution-output update --id <UUID> [--data <JSON>] [--databaseId <UUID>] [--hash <Base64EncodedBinary>]
csdk database-function-graph-execution-output delete --id <UUID>
```

## Examples

### List databaseFunctionGraphExecutionOutput records

```bash
csdk database-function-graph-execution-output list
```

### List databaseFunctionGraphExecutionOutput records with pagination

```bash
csdk database-function-graph-execution-output list --limit 10 --offset 0
```

### List databaseFunctionGraphExecutionOutput records with cursor pagination

```bash
csdk database-function-graph-execution-output list --limit 10 --after <cursor>
```

### Find first matching databaseFunctionGraphExecutionOutput

```bash
csdk database-function-graph-execution-output find-first --where.id.equalTo <value>
```

### List databaseFunctionGraphExecutionOutput records with field selection

```bash
csdk database-function-graph-execution-output list --select id,id
```

### List databaseFunctionGraphExecutionOutput records with filtering and ordering

```bash
csdk database-function-graph-execution-output list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseFunctionGraphExecutionOutput

```bash
csdk database-function-graph-execution-output create --data <JSON> --databaseId <UUID> --hash <Base64EncodedBinary>
```

### Get a databaseFunctionGraphExecutionOutput by id

```bash
csdk database-function-graph-execution-output get --id <value>
```
