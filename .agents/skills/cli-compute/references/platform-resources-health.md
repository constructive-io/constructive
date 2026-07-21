# platformResourcesHealth

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourcesHealth records via csdk CLI

## Usage

```bash
csdk platform-resources-health list
csdk platform-resources-health list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resources-health list --limit 10 --after <cursor>
csdk platform-resources-health find-first --where.<field>.<op> <value>
csdk platform-resources-health get --id <UUID>
csdk platform-resources-health create --annotations <JSON> --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --createdBy <UUID> --errorCount <Int> --installationId <UUID> --integrations <String> --kind <String> --labels <JSON> --lastError <String> --lastHeartbeatAt <Datetime> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --name <String> --namespaceId <UUID> --replicas <Int> --requiredConfigs <ResourceRequirement> --requiredSecrets <ResourceRequirement> --resourceDefinitionId <UUID> --slug <String> --spec <JSON> --status <String> --statusDetail <String> --statusObserved <JSON> --storageClass <String> --storageSizeBytes <BigInt> --updatedBy <UUID>
csdk platform-resources-health update --id <UUID> [--annotations <JSON>] [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--createdBy <UUID>] [--errorCount <Int>] [--installationId <UUID>] [--integrations <String>] [--kind <String>] [--labels <JSON>] [--lastError <String>] [--lastHeartbeatAt <Datetime>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--name <String>] [--namespaceId <UUID>] [--replicas <Int>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--resourceDefinitionId <UUID>] [--slug <String>] [--spec <JSON>] [--status <String>] [--statusDetail <String>] [--statusObserved <JSON>] [--storageClass <String>] [--storageSizeBytes <BigInt>] [--updatedBy <UUID>]
csdk platform-resources-health delete --id <UUID>
```

## Examples

### List platformResourcesHealth records

```bash
csdk platform-resources-health list
```

### List platformResourcesHealth records with pagination

```bash
csdk platform-resources-health list --limit 10 --offset 0
```

### List platformResourcesHealth records with cursor pagination

```bash
csdk platform-resources-health list --limit 10 --after <cursor>
```

### Find first matching platformResourcesHealth

```bash
csdk platform-resources-health find-first --where.id.equalTo <value>
```

### List platformResourcesHealth records with field selection

```bash
csdk platform-resources-health list --select id,id
```

### List platformResourcesHealth records with filtering and ordering

```bash
csdk platform-resources-health list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourcesHealth

```bash
csdk platform-resources-health create --annotations <JSON> --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --createdBy <UUID> --errorCount <Int> --installationId <UUID> --integrations <String> --kind <String> --labels <JSON> --lastError <String> --lastHeartbeatAt <Datetime> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --name <String> --namespaceId <UUID> --replicas <Int> --requiredConfigs <ResourceRequirement> --requiredSecrets <ResourceRequirement> --resourceDefinitionId <UUID> --slug <String> --spec <JSON> --status <String> --statusDetail <String> --statusObserved <JSON> --storageClass <String> --storageSizeBytes <BigInt> --updatedBy <UUID>
```

### Get a platformResourcesHealth by id

```bash
csdk platform-resources-health get --id <value>
```
