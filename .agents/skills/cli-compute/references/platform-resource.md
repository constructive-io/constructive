# platformResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResource records via csdk CLI

## Usage

```bash
csdk platform-resource list
csdk platform-resource list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource list --limit 10 --after <cursor>
csdk platform-resource find-first --where.<field>.<op> <value>
csdk platform-resource get --id <UUID>
csdk platform-resource create --namespaceId <UUID> --kind <String> --name <String> --slug <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
csdk platform-resource update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--namespaceId <UUID>] [--kind <String>] [--name <String>] [--slug <String>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
csdk platform-resource delete --id <UUID>
```

## Examples

### List platformResource records

```bash
csdk platform-resource list
```

### List platformResource records with pagination

```bash
csdk platform-resource list --limit 10 --offset 0
```

### List platformResource records with cursor pagination

```bash
csdk platform-resource list --limit 10 --after <cursor>
```

### Find first matching platformResource

```bash
csdk platform-resource find-first --where.id.equalTo <value>
```

### List platformResource records with field selection

```bash
csdk platform-resource list --select id,id
```

### List platformResource records with filtering and ordering

```bash
csdk platform-resource list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResource

```bash
csdk platform-resource create --namespaceId <UUID> --kind <String> --name <String> --slug <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--spec <JSON>] [--status <String>] [--statusObserved <JSON>] [--lastError <String>] [--errorCount <Int>] [--labels <JSON>] [--annotations <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--resourceDefinitionId <UUID>]
```

### Get a platformResource by id

```bash
csdk platform-resource get --id <value>
```
