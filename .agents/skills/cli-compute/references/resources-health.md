# resourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourcesHealth records via csdk CLI

## Usage

```bash
csdk resources-health list
csdk resources-health list --where.<field>.<op> <value> --orderBy <values>
csdk resources-health list --limit 10 --after <cursor>
csdk resources-health find-first --where.<field>.<op> <value>
csdk resources-health get --id <UUID>
csdk resources-health create --annotations <JSON> --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --createdBy <UUID> --databaseId <UUID> --errorCount <Int> --installationId <UUID> --integrations <String> --kind <String> --labels <JSON> --lastError <String> --lastHeartbeatAt <Datetime> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --name <String> --namespaceId <UUID> --replicas <Int> --requiredConfigs <ResourceRequirement> --requiredSecrets <ResourceRequirement> --resourceDefinitionId <UUID> --slug <String> --spec <JSON> --status <String> --statusDetail <String> --statusObserved <JSON> --storageClass <String> --storageSizeBytes <BigInt> --updatedBy <UUID>
csdk resources-health update --id <UUID> [--annotations <JSON>] [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--createdBy <UUID>] [--databaseId <UUID>] [--errorCount <Int>] [--installationId <UUID>] [--integrations <String>] [--kind <String>] [--labels <JSON>] [--lastError <String>] [--lastHeartbeatAt <Datetime>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--name <String>] [--namespaceId <UUID>] [--replicas <Int>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--resourceDefinitionId <UUID>] [--slug <String>] [--spec <JSON>] [--status <String>] [--statusDetail <String>] [--statusObserved <JSON>] [--storageClass <String>] [--storageSizeBytes <BigInt>] [--updatedBy <UUID>]
csdk resources-health delete --id <UUID>
```

## Examples

### List resourcesHealth records

```bash
csdk resources-health list
```

### List resourcesHealth records with pagination

```bash
csdk resources-health list --limit 10 --offset 0
```

### List resourcesHealth records with cursor pagination

```bash
csdk resources-health list --limit 10 --after <cursor>
```

### Find first matching resourcesHealth

```bash
csdk resources-health find-first --where.id.equalTo <value>
```

### List resourcesHealth records with field selection

```bash
csdk resources-health list --select id,id
```

### List resourcesHealth records with filtering and ordering

```bash
csdk resources-health list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourcesHealth

```bash
csdk resources-health create --annotations <JSON> --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --createdBy <UUID> --databaseId <UUID> --errorCount <Int> --installationId <UUID> --integrations <String> --kind <String> --labels <JSON> --lastError <String> --lastHeartbeatAt <Datetime> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --name <String> --namespaceId <UUID> --replicas <Int> --requiredConfigs <ResourceRequirement> --requiredSecrets <ResourceRequirement> --resourceDefinitionId <UUID> --slug <String> --spec <JSON> --status <String> --statusDetail <String> --statusObserved <JSON> --storageClass <String> --storageSizeBytes <BigInt> --updatedBy <UUID>
```

### Get a resourcesHealth by id

```bash
csdk resources-health get --id <value>
```
