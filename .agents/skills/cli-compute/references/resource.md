# resource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Resource records via csdk CLI

## Usage

```bash
csdk resource list
csdk resource list --where.<field>.<op> <value> --orderBy <values>
csdk resource list --limit 10 --after <cursor>
csdk resource find-first --where.<field>.<op> <value>
csdk resource get --id <UUID>
csdk resource create --databaseId <UUID> --kind <String> --name <String> --namespaceId <UUID> --slug <String> [--annotations <JSON>] [--createdBy <UUID>] [--errorCount <Int>] [--installationId <UUID>] [--integrations <String>] [--labels <JSON>] [--lastError <String>] [--lastHeartbeatAt <Datetime>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--resourceDefinitionId <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--updatedBy <UUID>]
csdk resource update --id <UUID> [--annotations <JSON>] [--createdBy <UUID>] [--databaseId <UUID>] [--errorCount <Int>] [--installationId <UUID>] [--integrations <String>] [--kind <String>] [--labels <JSON>] [--lastError <String>] [--lastHeartbeatAt <Datetime>] [--name <String>] [--namespaceId <UUID>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--resourceDefinitionId <UUID>] [--slug <String>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--updatedBy <UUID>]
csdk resource delete --id <UUID>
```

## Examples

### List resource records

```bash
csdk resource list
```

### List resource records with pagination

```bash
csdk resource list --limit 10 --offset 0
```

### List resource records with cursor pagination

```bash
csdk resource list --limit 10 --after <cursor>
```

### Find first matching resource

```bash
csdk resource find-first --where.id.equalTo <value>
```

### List resource records with field selection

```bash
csdk resource list --select id,id
```

### List resource records with filtering and ordering

```bash
csdk resource list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resource

```bash
csdk resource create --databaseId <UUID> --kind <String> --name <String> --namespaceId <UUID> --slug <String> [--annotations <JSON>] [--createdBy <UUID>] [--errorCount <Int>] [--installationId <UUID>] [--integrations <String>] [--labels <JSON>] [--lastError <String>] [--lastHeartbeatAt <Datetime>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--resourceDefinitionId <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--updatedBy <UUID>]
```

### Get a resource by id

```bash
csdk resource get --id <value>
```
