# orgFunctionExecutionLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgFunctionExecutionLog records via csdk CLI

## Usage

```bash
csdk org-function-execution-log list
csdk org-function-execution-log list --where.<field>.<op> <value> --orderBy <values>
csdk org-function-execution-log list --limit 10 --after <cursor>
csdk org-function-execution-log find-first --where.<field>.<op> <value>
csdk org-function-execution-log get --id <UUID>
csdk org-function-execution-log create --message <String> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--metadata <JSON>] [--actorId <UUID>]
csdk org-function-execution-log update --id <UUID> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--message <String>] [--metadata <JSON>] [--actorId <UUID>]
csdk org-function-execution-log delete --id <UUID>
```

## Examples

### List orgFunctionExecutionLog records

```bash
csdk org-function-execution-log list
```

### List orgFunctionExecutionLog records with pagination

```bash
csdk org-function-execution-log list --limit 10 --offset 0
```

### List orgFunctionExecutionLog records with cursor pagination

```bash
csdk org-function-execution-log list --limit 10 --after <cursor>
```

### Find first matching orgFunctionExecutionLog

```bash
csdk org-function-execution-log find-first --where.id.equalTo <value>
```

### List orgFunctionExecutionLog records with field selection

```bash
csdk org-function-execution-log list --select id,id
```

### List orgFunctionExecutionLog records with filtering and ordering

```bash
csdk org-function-execution-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgFunctionExecutionLog

```bash
csdk org-function-execution-log create --message <String> [--invocationId <UUID>] [--taskIdentifier <String>] [--logLevel <String>] [--metadata <JSON>] [--actorId <UUID>]
```

### Get a orgFunctionExecutionLog by id

```bash
csdk org-function-execution-log get --id <value>
```
