# platformDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformDeclaredCapacity records via csdk CLI

## Usage

```bash
csdk platform-declared-capacity list
csdk platform-declared-capacity list --where.<field>.<op> <value> --orderBy <values>
csdk platform-declared-capacity list --limit 10 --after <cursor>
csdk platform-declared-capacity find-first --where.<field>.<op> <value>
csdk platform-declared-capacity get --id <UUID>
csdk platform-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
csdk platform-declared-capacity update --id <UUID> [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--installationId <UUID>] [--isTransient <Boolean>] [--kind <String>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--namespaceId <UUID>] [--podCountMax <Int>] [--podCountMin <Int>] [--source <String>] [--sourceId <UUID>] [--storageSizeBytes <BigInt>]
csdk platform-declared-capacity delete --id <UUID>
```

## Examples

### List platformDeclaredCapacity records

```bash
csdk platform-declared-capacity list
```

### List platformDeclaredCapacity records with pagination

```bash
csdk platform-declared-capacity list --limit 10 --offset 0
```

### List platformDeclaredCapacity records with cursor pagination

```bash
csdk platform-declared-capacity list --limit 10 --after <cursor>
```

### Find first matching platformDeclaredCapacity

```bash
csdk platform-declared-capacity find-first --where.id.equalTo <value>
```

### List platformDeclaredCapacity records with field selection

```bash
csdk platform-declared-capacity list --select id,id
```

### List platformDeclaredCapacity records with filtering and ordering

```bash
csdk platform-declared-capacity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformDeclaredCapacity

```bash
csdk platform-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
```

### Get a platformDeclaredCapacity by id

```bash
csdk platform-declared-capacity get --id <value>
```
