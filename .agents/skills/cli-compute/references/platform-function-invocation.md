# platformFunctionInvocation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionInvocation records via csdk CLI

## Usage

```bash
csdk platform-function-invocation list
csdk platform-function-invocation list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-invocation list --limit 10 --after <cursor>
csdk platform-function-invocation find-first --where.<field>.<op> <value>
csdk platform-function-invocation get --id <UUID>
csdk platform-function-invocation create --taskIdentifier <String> [--actorId <UUID>] [--apiBindingId <UUID>] [--channel <String>] [--completedAt <Datetime>] [--definitionScope <String>] [--durationMs <Int>] [--error <String>] [--functionDefinitionId <UUID>] [--graphExecutionId <UUID>] [--jobId <BigInt>] [--parentInvocationId <UUID>] [--payload <JSON>] [--provenance <JSON>] [--result <JSON>] [--startedAt <Datetime>] [--status <String>]
csdk platform-function-invocation update --id <UUID> [--actorId <UUID>] [--apiBindingId <UUID>] [--channel <String>] [--completedAt <Datetime>] [--definitionScope <String>] [--durationMs <Int>] [--error <String>] [--functionDefinitionId <UUID>] [--graphExecutionId <UUID>] [--jobId <BigInt>] [--parentInvocationId <UUID>] [--payload <JSON>] [--provenance <JSON>] [--result <JSON>] [--startedAt <Datetime>] [--status <String>] [--taskIdentifier <String>]
csdk platform-function-invocation delete --id <UUID>
```

## Examples

### List platformFunctionInvocation records

```bash
csdk platform-function-invocation list
```

### List platformFunctionInvocation records with pagination

```bash
csdk platform-function-invocation list --limit 10 --offset 0
```

### List platformFunctionInvocation records with cursor pagination

```bash
csdk platform-function-invocation list --limit 10 --after <cursor>
```

### Find first matching platformFunctionInvocation

```bash
csdk platform-function-invocation find-first --where.id.equalTo <value>
```

### List platformFunctionInvocation records with field selection

```bash
csdk platform-function-invocation list --select id,id
```

### List platformFunctionInvocation records with filtering and ordering

```bash
csdk platform-function-invocation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionInvocation

```bash
csdk platform-function-invocation create --taskIdentifier <String> [--actorId <UUID>] [--apiBindingId <UUID>] [--channel <String>] [--completedAt <Datetime>] [--definitionScope <String>] [--durationMs <Int>] [--error <String>] [--functionDefinitionId <UUID>] [--graphExecutionId <UUID>] [--jobId <BigInt>] [--parentInvocationId <UUID>] [--payload <JSON>] [--provenance <JSON>] [--result <JSON>] [--startedAt <Datetime>] [--status <String>]
```

### Get a platformFunctionInvocation by id

```bash
csdk platform-function-invocation get --id <value>
```
