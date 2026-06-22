# functionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionExecutionLog records via csdk CLI

## Usage

```bash
csdk function-execution-log list
csdk function-execution-log list --where.<field>.<op> <value> --orderBy <values>
csdk function-execution-log list --limit 10 --after <cursor>
csdk function-execution-log find-first --where.<field>.<op> <value>
csdk function-execution-log get --id <UUID>
csdk function-execution-log create --message <String> --databaseId <UUID> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--metadata <JSON>] [--actorId <UUID>]
csdk function-execution-log update --id <UUID> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--message <String>] [--metadata <JSON>] [--actorId <UUID>] [--databaseId <UUID>]
csdk function-execution-log delete --id <UUID>
```

## Examples

### List functionExecutionLog records

```bash
csdk function-execution-log list
```

### List functionExecutionLog records with pagination

```bash
csdk function-execution-log list --limit 10 --offset 0
```

### List functionExecutionLog records with cursor pagination

```bash
csdk function-execution-log list --limit 10 --after <cursor>
```

### Find first matching functionExecutionLog

```bash
csdk function-execution-log find-first --where.id.equalTo <value>
```

### List functionExecutionLog records with field selection

```bash
csdk function-execution-log list --select id,id
```

### List functionExecutionLog records with filtering and ordering

```bash
csdk function-execution-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionExecutionLog

```bash
csdk function-execution-log create --message <String> --databaseId <UUID> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--metadata <JSON>] [--actorId <UUID>]
```

### Get a functionExecutionLog by id

```bash
csdk function-execution-log get --id <value>
```
