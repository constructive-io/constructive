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
csdk platform-function-deployment create --image <String> --namespaceId <UUID> [--annotations <JSON>] [--concurrency <Int>] [--errorCount <Int>] [--handlerName <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
csdk platform-function-deployment update --id <UUID> [--annotations <JSON>] [--concurrency <Int>] [--errorCount <Int>] [--handlerName <String>] [--image <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--namespaceId <UUID>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
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
csdk platform-function-deployment create --image <String> --namespaceId <UUID> [--annotations <JSON>] [--concurrency <Int>] [--errorCount <Int>] [--handlerName <String>] [--imageVersion <String>] [--labels <JSON>] [--lastError <String>] [--lastErrorAt <Datetime>] [--resources <JSON>] [--revision <Int>] [--scaleMax <Int>] [--scaleMin <Int>] [--serviceName <String>] [--serviceUrl <String>] [--status <String>] [--timeoutSeconds <Int>]
```

### Get a platformFunctionDeployment by id

```bash
csdk platform-function-deployment get --id <value>
```
