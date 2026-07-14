# platformFunctionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionExecutionLog records via csdk CLI

## Usage

```bash
csdk platform-function-execution-log list
csdk platform-function-execution-log list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-execution-log list --limit 10 --after <cursor>
csdk platform-function-execution-log find-first --where.<field>.<op> <value>
csdk platform-function-execution-log get --id <UUID>
csdk platform-function-execution-log create --message <String> [--actorId <UUID>] [--invocationId <UUID>] [--logLevel <String>] [--metadata <JSON>] [--taskIdentifier <String>]
csdk platform-function-execution-log update --id <UUID> [--actorId <UUID>] [--invocationId <UUID>] [--logLevel <String>] [--message <String>] [--metadata <JSON>] [--taskIdentifier <String>]
csdk platform-function-execution-log delete --id <UUID>
```

## Examples

### List platformFunctionExecutionLog records

```bash
csdk platform-function-execution-log list
```

### List platformFunctionExecutionLog records with pagination

```bash
csdk platform-function-execution-log list --limit 10 --offset 0
```

### List platformFunctionExecutionLog records with cursor pagination

```bash
csdk platform-function-execution-log list --limit 10 --after <cursor>
```

### Find first matching platformFunctionExecutionLog

```bash
csdk platform-function-execution-log find-first --where.id.equalTo <value>
```

### List platformFunctionExecutionLog records with field selection

```bash
csdk platform-function-execution-log list --select id,id
```

### List platformFunctionExecutionLog records with filtering and ordering

```bash
csdk platform-function-execution-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionExecutionLog

```bash
csdk platform-function-execution-log create --message <String> [--actorId <UUID>] [--invocationId <UUID>] [--logLevel <String>] [--metadata <JSON>] [--taskIdentifier <String>]
```

### Get a platformFunctionExecutionLog by id

```bash
csdk platform-function-execution-log get --id <value>
```
