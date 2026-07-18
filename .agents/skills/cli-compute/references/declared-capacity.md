# declaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DeclaredCapacity records via csdk CLI

## Usage

```bash
csdk declared-capacity list
csdk declared-capacity list --where.<field>.<op> <value> --orderBy <values>
csdk declared-capacity list --limit 10 --after <cursor>
csdk declared-capacity find-first --where.<field>.<op> <value>
csdk declared-capacity get --id <UUID>
csdk declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
csdk declared-capacity update --id <UUID> [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--installationId <UUID>] [--isTransient <Boolean>] [--kind <String>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--namespaceId <UUID>] [--podCountMax <Int>] [--podCountMin <Int>] [--source <String>] [--sourceId <UUID>] [--storageSizeBytes <BigInt>]
csdk declared-capacity delete --id <UUID>
```

## Examples

### List declaredCapacity records

```bash
csdk declared-capacity list
```

### List declaredCapacity records with pagination

```bash
csdk declared-capacity list --limit 10 --offset 0
```

### List declaredCapacity records with cursor pagination

```bash
csdk declared-capacity list --limit 10 --after <cursor>
```

### Find first matching declaredCapacity

```bash
csdk declared-capacity find-first --where.id.equalTo <value>
```

### List declaredCapacity records with field selection

```bash
csdk declared-capacity list --select id,id
```

### List declaredCapacity records with filtering and ordering

```bash
csdk declared-capacity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a declaredCapacity

```bash
csdk declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
```

### Get a declaredCapacity by id

```bash
csdk declared-capacity get --id <value>
```
