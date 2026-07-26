# platformResourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceDeclaredCapacity records via csdk CLI

## Usage

```bash
csdk platform-resource-declared-capacity list
csdk platform-resource-declared-capacity list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-declared-capacity list --limit 10 --after <cursor>
csdk platform-resource-declared-capacity find-first --where.<field>.<op> <value>
csdk platform-resource-declared-capacity get --id <UUID>
csdk platform-resource-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
csdk platform-resource-declared-capacity update --id <UUID> [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--installationId <UUID>] [--isTransient <Boolean>] [--kind <String>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--namespaceId <UUID>] [--podCountMax <Int>] [--podCountMin <Int>] [--source <String>] [--sourceId <UUID>] [--storageSizeBytes <BigInt>]
csdk platform-resource-declared-capacity delete --id <UUID>
```

## Examples

### List platformResourceDeclaredCapacity records

```bash
csdk platform-resource-declared-capacity list
```

### List platformResourceDeclaredCapacity records with pagination

```bash
csdk platform-resource-declared-capacity list --limit 10 --offset 0
```

### List platformResourceDeclaredCapacity records with cursor pagination

```bash
csdk platform-resource-declared-capacity list --limit 10 --after <cursor>
```

### Find first matching platformResourceDeclaredCapacity

```bash
csdk platform-resource-declared-capacity find-first --where.id.equalTo <value>
```

### List platformResourceDeclaredCapacity records with field selection

```bash
csdk platform-resource-declared-capacity list --select id,id
```

### List platformResourceDeclaredCapacity records with filtering and ordering

```bash
csdk platform-resource-declared-capacity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceDeclaredCapacity

```bash
csdk platform-resource-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
```

### Get a platformResourceDeclaredCapacity by id

```bash
csdk platform-resource-declared-capacity get --id <value>
```
