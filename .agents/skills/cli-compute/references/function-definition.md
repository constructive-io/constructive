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
csdk function-definition create --category <String> --databaseId <UUID> --name <String> [--accessChannels <String>] [--concurrency <Int>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--graphId <UUID>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--protected <Boolean>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
csdk function-definition update --id <UUID> [--accessChannels <String>] [--category <String>] [--concurrency <Int>] [--databaseId <UUID>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--graphId <UUID>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--name <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--protected <Boolean>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
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
csdk function-definition create --category <String> --databaseId <UUID> --name <String> [--accessChannels <String>] [--concurrency <Int>] [--description <String>] [--fnCategory <String>] [--functionColumns <JSON>] [--graphId <UUID>] [--icon <String>] [--image <String>] [--inputs <JSON>] [--integrations <String>] [--isPublished <Boolean>] [--maxAttempts <Int>] [--moduleTable <String>] [--outputs <JSON>] [--payloadArgs <JSON>] [--priority <Int>] [--props <JSON>] [--protected <Boolean>] [--publishedAt <Datetime>] [--queueName <String>] [--requiredBuckets <String>] [--requiredConfigs <ResourceRequirement>] [--requiredModels <String>] [--requiredSecrets <ResourceRequirement>] [--resources <JSON>] [--runtime <String>] [--scaleMax <Int>] [--scaleMin <Int>] [--targetFunction <String>] [--targetSchema <String>] [--timeoutSeconds <Int>] [--volatile <Boolean>]
```

### Get a functionDefinition by id

```bash
csdk function-definition get --id <value>
```
