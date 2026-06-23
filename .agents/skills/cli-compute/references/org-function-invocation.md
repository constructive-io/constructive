# orgFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgFunctionInvocation records via csdk CLI

## Usage

```bash
csdk org-function-invocation list
csdk org-function-invocation list --where.<field>.<op> <value> --orderBy <values>
csdk org-function-invocation list --limit 10 --after <cursor>
csdk org-function-invocation find-first --where.<field>.<op> <value>
csdk org-function-invocation get --id <UUID>
csdk org-function-invocation create --taskIdentifier <String> [--actorId <UUID>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
csdk org-function-invocation update --id <UUID> [--actorId <UUID>] [--taskIdentifier <String>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
csdk org-function-invocation delete --id <UUID>
```

## Examples

### List orgFunctionInvocation records

```bash
csdk org-function-invocation list
```

### List orgFunctionInvocation records with pagination

```bash
csdk org-function-invocation list --limit 10 --offset 0
```

### List orgFunctionInvocation records with cursor pagination

```bash
csdk org-function-invocation list --limit 10 --after <cursor>
```

### Find first matching orgFunctionInvocation

```bash
csdk org-function-invocation find-first --where.id.equalTo <value>
```

### List orgFunctionInvocation records with field selection

```bash
csdk org-function-invocation list --select id,id
```

### List orgFunctionInvocation records with filtering and ordering

```bash
csdk org-function-invocation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgFunctionInvocation

```bash
csdk org-function-invocation create --taskIdentifier <String> [--actorId <UUID>] [--payload <JSON>] [--status <String>] [--result <JSON>] [--error <String>] [--durationMs <Int>] [--jobId <BigInt>] [--startedAt <Datetime>] [--completedAt <Datetime>] [--parentInvocationId <UUID>] [--graphExecutionId <UUID>]
```

### Get a orgFunctionInvocation by id

```bash
csdk org-function-invocation get --id <value>
```
