# functionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionInvocation records via csdk CLI

## Usage

```bash
csdk function-invocation list
csdk function-invocation list --where.<field>.<op> <value> --orderBy <values>
csdk function-invocation list --limit 10 --after <cursor>
csdk function-invocation find-first --where.<field>.<op> <value>
csdk function-invocation get --id <UUID>
csdk function-invocation create --databaseId <UUID> --taskIdentifier <String> [--actorId <UUID>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
csdk function-invocation update --id <UUID> [--actorId <UUID>] [--databaseId <UUID>] [--taskIdentifier <String>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
csdk function-invocation delete --id <UUID>
```

## Examples

### List functionInvocation records

```bash
csdk function-invocation list
```

### List functionInvocation records with pagination

```bash
csdk function-invocation list --limit 10 --offset 0
```

### List functionInvocation records with cursor pagination

```bash
csdk function-invocation list --limit 10 --after <cursor>
```

### Find first matching functionInvocation

```bash
csdk function-invocation find-first --where.id.equalTo <value>
```

### List functionInvocation records with field selection

```bash
csdk function-invocation list --select id,id
```

### List functionInvocation records with filtering and ordering

```bash
csdk function-invocation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionInvocation

```bash
csdk function-invocation create --databaseId <UUID> --taskIdentifier <String> [--actorId <UUID>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
```

### Get a functionInvocation by id

```bash
csdk function-invocation get --id <value>
```
