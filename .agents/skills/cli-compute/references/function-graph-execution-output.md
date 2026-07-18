# functionGraphExecutionOutput

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphExecutionOutput records via csdk CLI

## Usage

```bash
csdk function-graph-execution-output list
csdk function-graph-execution-output list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-execution-output list --limit 10 --after <cursor>
csdk function-graph-execution-output find-first --where.<field>.<op> <value>
csdk function-graph-execution-output get --id <UUID>
csdk function-graph-execution-output create --data <JSON> --hash <Base64EncodedBinary> --scopeId <UUID>
csdk function-graph-execution-output update --id <UUID> [--data <JSON>] [--hash <Base64EncodedBinary>] [--scopeId <UUID>]
csdk function-graph-execution-output delete --id <UUID>
```

## Examples

### List functionGraphExecutionOutput records

```bash
csdk function-graph-execution-output list
```

### List functionGraphExecutionOutput records with pagination

```bash
csdk function-graph-execution-output list --limit 10 --offset 0
```

### List functionGraphExecutionOutput records with cursor pagination

```bash
csdk function-graph-execution-output list --limit 10 --after <cursor>
```

### Find first matching functionGraphExecutionOutput

```bash
csdk function-graph-execution-output find-first --where.id.equalTo <value>
```

### List functionGraphExecutionOutput records with field selection

```bash
csdk function-graph-execution-output list --select id,id
```

### List functionGraphExecutionOutput records with filtering and ordering

```bash
csdk function-graph-execution-output list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphExecutionOutput

```bash
csdk function-graph-execution-output create --data <JSON> --hash <Base64EncodedBinary> --scopeId <UUID>
```

### Get a functionGraphExecutionOutput by id

```bash
csdk function-graph-execution-output get --id <value>
```
