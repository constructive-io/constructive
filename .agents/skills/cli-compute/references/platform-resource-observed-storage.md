# platformResourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceObservedStorage records via csdk CLI

## Usage

```bash
csdk platform-resource-observed-storage list
csdk platform-resource-observed-storage list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-observed-storage list --limit 10 --after <cursor>
csdk platform-resource-observed-storage find-first --where.<field>.<op> <value>
csdk platform-resource-observed-storage get --id <UUID>
csdk platform-resource-observed-storage create --capacity <String> --capacityBytes <BigInt> --claimName <String> --declaredStorageClass <String> --declaredStorageSizeBytes <BigInt> --declaredStorageTotalBytes <BigInt> --installationId <UUID> --isBound <Boolean> --kind <String> --namespaceId <UUID> --phase <String> --requested <String> --requestedBytes <BigInt> --resourceId <UUID> --resourceStatus <String> --slug <String> --storageClass <String> --storageName <String>
csdk platform-resource-observed-storage update --id <UUID> [--capacity <String>] [--capacityBytes <BigInt>] [--claimName <String>] [--declaredStorageClass <String>] [--declaredStorageSizeBytes <BigInt>] [--declaredStorageTotalBytes <BigInt>] [--installationId <UUID>] [--isBound <Boolean>] [--kind <String>] [--namespaceId <UUID>] [--phase <String>] [--requested <String>] [--requestedBytes <BigInt>] [--resourceId <UUID>] [--resourceStatus <String>] [--slug <String>] [--storageClass <String>] [--storageName <String>]
csdk platform-resource-observed-storage delete --id <UUID>
```

## Examples

### List platformResourceObservedStorage records

```bash
csdk platform-resource-observed-storage list
```

### List platformResourceObservedStorage records with pagination

```bash
csdk platform-resource-observed-storage list --limit 10 --offset 0
```

### List platformResourceObservedStorage records with cursor pagination

```bash
csdk platform-resource-observed-storage list --limit 10 --after <cursor>
```

### Find first matching platformResourceObservedStorage

```bash
csdk platform-resource-observed-storage find-first --where.id.equalTo <value>
```

### List platformResourceObservedStorage records with field selection

```bash
csdk platform-resource-observed-storage list --select id,id
```

### List platformResourceObservedStorage records with filtering and ordering

```bash
csdk platform-resource-observed-storage list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceObservedStorage

```bash
csdk platform-resource-observed-storage create --capacity <String> --capacityBytes <BigInt> --claimName <String> --declaredStorageClass <String> --declaredStorageSizeBytes <BigInt> --declaredStorageTotalBytes <BigInt> --installationId <UUID> --isBound <Boolean> --kind <String> --namespaceId <UUID> --phase <String> --requested <String> --requestedBytes <BigInt> --resourceId <UUID> --resourceStatus <String> --slug <String> --storageClass <String> --storageName <String>
```

### Get a platformResourceObservedStorage by id

```bash
csdk platform-resource-observed-storage get --id <value>
```
