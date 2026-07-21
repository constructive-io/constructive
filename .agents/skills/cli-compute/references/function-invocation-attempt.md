# functionInvocationAttempt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionInvocationAttempt records via csdk CLI

## Usage

```bash
csdk function-invocation-attempt list
csdk function-invocation-attempt list --where.<field>.<op> <value> --orderBy <values>
csdk function-invocation-attempt list --limit 10 --after <cursor>
csdk function-invocation-attempt find-first --where.<field>.<op> <value>
csdk function-invocation-attempt get --id <UUID>
csdk function-invocation-attempt create --attempt <Int> --databaseId <UUID> --invocationCreatedAt <Datetime> --invocationId <UUID> --success <Boolean> --taskIdentifier <String> [--actorId <UUID>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--startedAt <Datetime>]
csdk function-invocation-attempt update --id <UUID> [--actorId <UUID>] [--attempt <Int>] [--databaseId <UUID>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--invocationCreatedAt <Datetime>] [--invocationId <UUID>] [--startedAt <Datetime>] [--success <Boolean>] [--taskIdentifier <String>]
csdk function-invocation-attempt delete --id <UUID>
```

## Examples

### List functionInvocationAttempt records

```bash
csdk function-invocation-attempt list
```

### List functionInvocationAttempt records with pagination

```bash
csdk function-invocation-attempt list --limit 10 --offset 0
```

### List functionInvocationAttempt records with cursor pagination

```bash
csdk function-invocation-attempt list --limit 10 --after <cursor>
```

### Find first matching functionInvocationAttempt

```bash
csdk function-invocation-attempt find-first --where.id.equalTo <value>
```

### List functionInvocationAttempt records with field selection

```bash
csdk function-invocation-attempt list --select id,id
```

### List functionInvocationAttempt records with filtering and ordering

```bash
csdk function-invocation-attempt list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionInvocationAttempt

```bash
csdk function-invocation-attempt create --attempt <Int> --databaseId <UUID> --invocationCreatedAt <Datetime> --invocationId <UUID> --success <Boolean> --taskIdentifier <String> [--actorId <UUID>] [--durationMs <Int>] [--error <String>] [--errorDetail <JSON>] [--startedAt <Datetime>]
```

### Get a functionInvocationAttempt by id

```bash
csdk function-invocation-attempt get --id <value>
```
