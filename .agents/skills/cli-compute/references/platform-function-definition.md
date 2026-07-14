# platformFunctionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionDefinition records via csdk CLI

## Usage

```bash
csdk platform-function-definition list
csdk platform-function-definition list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-definition list --limit 10 --after <cursor>
csdk platform-function-definition find-first --where.<field>.<op> <value>
csdk platform-function-definition get --id <UUID>
csdk platform-function-definition create --category <String> --name <String> --taskIdentifier <String> [--accessChannels <String>] [--concurrency <Int>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
csdk platform-function-definition update --id <UUID> [--accessChannels <String>] [--category <String>] [--concurrency <Int>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--name <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--taskIdentifier <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
csdk platform-function-definition delete --id <UUID>
```

## Examples

### List platformFunctionDefinition records

```bash
csdk platform-function-definition list
```

### List platformFunctionDefinition records with pagination

```bash
csdk platform-function-definition list --limit 10 --offset 0
```

### List platformFunctionDefinition records with cursor pagination

```bash
csdk platform-function-definition list --limit 10 --after <cursor>
```

### Find first matching platformFunctionDefinition

```bash
csdk platform-function-definition find-first --where.id.equalTo <value>
```

### List platformFunctionDefinition records with field selection

```bash
csdk platform-function-definition list --select id,id
```

### List platformFunctionDefinition records with filtering and ordering

```bash
csdk platform-function-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionDefinition

```bash
csdk platform-function-definition create --category <String> --name <String> --taskIdentifier <String> [--accessChannels <String>] [--concurrency <Int>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
```

### Get a platformFunctionDefinition by id

```bash
csdk platform-function-definition get --id <value>
```
