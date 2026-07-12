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
csdk platform-function-definition create --scope <String> --name <String> --taskIdentifier <String> [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>]
csdk platform-function-definition update --id <UUID> [--scope <String>] [--name <String>] [--taskIdentifier <String>] [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>]
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
csdk platform-function-definition create --scope <String> --name <String> --taskIdentifier <String> [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>]
```

### Get a platformFunctionDefinition by id

```bash
csdk platform-function-definition get --id <value>
```
