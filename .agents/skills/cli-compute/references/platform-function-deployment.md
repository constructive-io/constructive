# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionDeployment records via csdk CLI

## Usage

```bash
csdk platform-function-deployment list
csdk platform-function-deployment list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-deployment list --limit 10 --after <cursor>
csdk platform-function-deployment find-first --where.<field>.<op> <value>
csdk platform-function-deployment get --id <UUID>
csdk platform-function-deployment create --namespaceId <UUID> --image <String> [--status <String>] [--serviceUrl <String>] [--serviceName <String>] [--revision <Int>] [--imageVersion <String>] [--handlerName <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>]
csdk platform-function-deployment update --id <UUID> [--namespaceId <UUID>] [--status <String>] [--serviceUrl <String>] [--serviceName <String>] [--revision <Int>] [--image <String>] [--imageVersion <String>] [--handlerName <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>]
csdk platform-function-deployment delete --id <UUID>
```

## Examples

### List platformFunctionDeployment records

```bash
csdk platform-function-deployment list
```

### List platformFunctionDeployment records with pagination

```bash
csdk platform-function-deployment list --limit 10 --offset 0
```

### List platformFunctionDeployment records with cursor pagination

```bash
csdk platform-function-deployment list --limit 10 --after <cursor>
```

### Find first matching platformFunctionDeployment

```bash
csdk platform-function-deployment find-first --where.id.equalTo <value>
```

### List platformFunctionDeployment records with field selection

```bash
csdk platform-function-deployment list --select id,id
```

### List platformFunctionDeployment records with filtering and ordering

```bash
csdk platform-function-deployment list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionDeployment

```bash
csdk platform-function-deployment create --namespaceId <UUID> --image <String> [--status <String>] [--serviceUrl <String>] [--serviceName <String>] [--revision <Int>] [--imageVersion <String>] [--handlerName <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>]
```

### Get a platformFunctionDeployment by id

```bash
csdk platform-function-deployment get --id <value>
```
