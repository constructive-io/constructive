# resourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceDeclaredCapacity records via csdk CLI

## Usage

```bash
csdk resource-declared-capacity list
csdk resource-declared-capacity list --where.<field>.<op> <value> --orderBy <values>
csdk resource-declared-capacity list --limit 10 --after <cursor>
csdk resource-declared-capacity find-first --where.<field>.<op> <value>
csdk resource-declared-capacity get --id <UUID>
csdk resource-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
csdk resource-declared-capacity update --id <UUID> [--cpuLimitMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--installationId <UUID>] [--isTransient <Boolean>] [--kind <String>] [--memoryLimitBytes <BigInt>] [--memoryRequestBytes <BigInt>] [--namespaceId <UUID>] [--podCountMax <Int>] [--podCountMin <Int>] [--source <String>] [--sourceId <UUID>] [--storageSizeBytes <BigInt>]
csdk resource-declared-capacity delete --id <UUID>
```

## Examples

### List resourceDeclaredCapacity records

```bash
csdk resource-declared-capacity list
```

### List resourceDeclaredCapacity records with pagination

```bash
csdk resource-declared-capacity list --limit 10 --offset 0
```

### List resourceDeclaredCapacity records with cursor pagination

```bash
csdk resource-declared-capacity list --limit 10 --after <cursor>
```

### Find first matching resourceDeclaredCapacity

```bash
csdk resource-declared-capacity find-first --where.id.equalTo <value>
```

### List resourceDeclaredCapacity records with field selection

```bash
csdk resource-declared-capacity list --select id,id
```

### List resourceDeclaredCapacity records with filtering and ordering

```bash
csdk resource-declared-capacity list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceDeclaredCapacity

```bash
csdk resource-declared-capacity create --cpuLimitMillicores <BigInt> --cpuRequestMillicores <BigInt> --installationId <UUID> --isTransient <Boolean> --kind <String> --memoryLimitBytes <BigInt> --memoryRequestBytes <BigInt> --namespaceId <UUID> --podCountMax <Int> --podCountMin <Int> --source <String> --sourceId <UUID> --storageSizeBytes <BigInt>
```

### Get a resourceDeclaredCapacity by id

```bash
csdk resource-declared-capacity get --id <value>
```
