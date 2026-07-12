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
csdk resource create --namespaceId <UUID> --kind <String> --name <String> --slug <String> --databaseId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
csdk resource update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--namespaceId <UUID>] [--kind <String>] [--name <String>] [--slug <String>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--databaseId <UUID>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
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
csdk resource create --namespaceId <UUID> --kind <String> --name <String> --slug <String> --databaseId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
```

### Get a resource by id

```bash
csdk resource get --id <value>
```
