# functionDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionDefinition records via csdk CLI

## Usage

```bash
csdk function-definition list
csdk function-definition list --where.<field>.<op> <value> --orderBy <values>
csdk function-definition list --limit 10 --after <cursor>
csdk function-definition find-first --where.<field>.<op> <value>
csdk function-definition get --id <UUID>
csdk function-definition create --scope <String> --name <String> --taskIdentifier <String> --databaseId <UUID> [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>]
csdk function-definition update --id <UUID> [--scope <String>] [--name <String>] [--taskIdentifier <String>] [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>] [--databaseId <UUID>]
csdk function-definition delete --id <UUID>
```

## Examples

### List functionDefinition records

```bash
csdk function-definition list
```

### List functionDefinition records with pagination

```bash
csdk function-definition list --limit 10 --offset 0
```

### List functionDefinition records with cursor pagination

```bash
csdk function-definition list --limit 10 --after <cursor>
```

### Find first matching functionDefinition

```bash
csdk function-definition find-first --where.id.equalTo <value>
```

### List functionDefinition records with field selection

```bash
csdk function-definition list --select id,id
```

### List functionDefinition records with filtering and ordering

```bash
csdk function-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionDefinition

```bash
csdk function-definition create --scope <String> --name <String> --taskIdentifier <String> --databaseId <UUID> [--description <String>] [--isPublished <Boolean>] [--accessChannels <String>] [--publishedAt <Datetime>] [--maxAttempts <Int>] [--priority <Int>] [--queueName <String>] [--runtime <String>] [--targetSchema <String>] [--targetFunction <String>] [--moduleTable <String>] [--functionColumns <JSON>] [--payloadArgs <JSON>] [--image <String>] [--concurrency <Int>] [--scaleMin <Int>] [--scaleMax <Int>] [--timeoutSeconds <Int>] [--resources <JSON>] [--isBuiltIn <Boolean>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--requiredBuckets <String>] [--requiredModels <String>] [--inputs <JSON>] [--outputs <JSON>] [--props <JSON>] [--volatile <Boolean>] [--icon <String>] [--category <String>]
```

### Get a functionDefinition by id

```bash
csdk function-definition get --id <value>
```
