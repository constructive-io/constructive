# platformFunctionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionInvocationAttempt records via csdk CLI

## Usage

```bash
csdk platform-function-invocation-attempt list
csdk platform-function-invocation-attempt list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-invocation-attempt list --limit 10 --after <cursor>
csdk platform-function-invocation-attempt find-first --where.<field>.<op> <value>
csdk platform-function-invocation-attempt get --id <UUID>
csdk platform-function-invocation-attempt create --attempt <Int> --invocationCreatedAt <Datetime> --invocationId <UUID> --success <Boolean> --taskIdentifier <String> [--actorId <UUID>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--startedAt <Datetime>]
csdk platform-function-invocation-attempt update --id <UUID> [--actorId <UUID>] [--attempt <Int>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--startedAt <Datetime>] [--success <Boolean>] [--taskIdentifier <String>]
csdk platform-function-invocation-attempt delete --id <UUID>
```

## Examples

### List platformFunctionInvocationAttempt records

```bash
csdk platform-function-invocation-attempt list
```

### List platformFunctionInvocationAttempt records with pagination

```bash
csdk platform-function-invocation-attempt list --limit 10 --offset 0
```

### List platformFunctionInvocationAttempt records with cursor pagination

```bash
csdk platform-function-invocation-attempt list --limit 10 --after <cursor>
```

### Find first matching platformFunctionInvocationAttempt

```bash
csdk platform-function-invocation-attempt find-first --where.id.equalTo <value>
```

### List platformFunctionInvocationAttempt records with field selection

```bash
csdk platform-function-invocation-attempt list --select id,id
```

### List platformFunctionInvocationAttempt records with filtering and ordering

```bash
csdk platform-function-invocation-attempt list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionInvocationAttempt

```bash
csdk platform-function-invocation-attempt create --attempt <Int> --invocationCreatedAt <Datetime> --invocationId <UUID> --success <Boolean> --taskIdentifier <String> [--actorId <UUID>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--startedAt <Datetime>]
```

### Get a platformFunctionInvocationAttempt by id

```bash
csdk platform-function-invocation-attempt get --id <value>
```
