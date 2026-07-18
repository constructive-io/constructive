# functionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionDeployment records via csdk CLI

## Usage

```bash
csdk function-deployment list
csdk function-deployment list --where.<field>.<op> <value> --orderBy <values>
csdk function-deployment list --limit 10 --after <cursor>
csdk function-deployment find-first --where.<field>.<op> <value>
csdk function-deployment get --id <UUID>
csdk function-deployment create --databaseId <UUID> --image <String> --namespaceId <UUID> [--annotations <JSON>] [--concurrency <Int>] [--errorCount <Int>] [--handlerName <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
csdk function-deployment update --id <UUID> [--annotations <JSON>] [--concurrency <Int>] [--databaseId <UUID>] [--errorCount <Int>] [--handlerName <String>] [--image <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--namespaceId <UUID>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
csdk function-deployment delete --id <UUID>
```

## Examples

### List functionDeployment records

```bash
csdk function-deployment list
```

### List functionDeployment records with pagination

```bash
csdk function-deployment list --limit 10 --offset 0
```

### List functionDeployment records with cursor pagination

```bash
csdk function-deployment list --limit 10 --after <cursor>
```

### Find first matching functionDeployment

```bash
csdk function-deployment find-first --where.id.equalTo <value>
```

### List functionDeployment records with field selection

```bash
csdk function-deployment list --select id,id
```

### List functionDeployment records with filtering and ordering

```bash
csdk function-deployment list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionDeployment

```bash
csdk function-deployment create --databaseId <UUID> --image <String> --namespaceId <UUID> [--annotations <JSON>] [--concurrency <Int>] [--errorCount <Int>] [--handlerName <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
```

### Get a functionDeployment by id

```bash
csdk function-deployment get --id <value>
```
