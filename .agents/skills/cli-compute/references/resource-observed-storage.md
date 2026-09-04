# resourceObservedStorage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceObservedStorage records via csdk CLI

## Usage

```bash
csdk resource-observed-storage list
csdk resource-observed-storage list --where.<field>.<op> <value> --orderBy <values>
csdk resource-observed-storage list --limit 10 --after <cursor>
csdk resource-observed-storage find-first --where.<field>.<op> <value>
csdk resource-observed-storage get --id <UUID>
csdk resource-observed-storage create --capacity <String> --capacityBytes <BigInt> --claimName <String> --declaredStorageClass <String> --declaredStorageSizeBytes <BigInt> --declaredStorageTotalBytes <BigInt> --installationId <UUID> --isBound <Boolean> --kind <String> --namespaceId <UUID> --phase <String> --requested <String> --requestedBytes <BigInt> --resourceId <UUID> --resourceStatus <String> --slug <String> --storageClass <String> --storageName <String>
csdk resource-observed-storage update --id <UUID> [--capacity <String>] [--capacityBytes <BigInt>] [--claimName <String>] [--declaredStorageClass <String>] [--declaredStorageSizeBytes <BigInt>] [--declaredStorageTotalBytes <BigInt>] [--installationId <UUID>] [--isBound <Boolean>] [--kind <String>] [--namespaceId <UUID>] [--phase <String>] [--requested <String>] [--requestedBytes <BigInt>] [--resourceId <UUID>] [--resourceStatus <String>] [--slug <String>] [--storageClass <String>] [--storageName <String>]
csdk resource-observed-storage delete --id <UUID>
```

## Examples

### List resourceObservedStorage records

```bash
csdk resource-observed-storage list
```

### List resourceObservedStorage records with pagination

```bash
csdk resource-observed-storage list --limit 10 --offset 0
```

### List resourceObservedStorage records with cursor pagination

```bash
csdk resource-observed-storage list --limit 10 --after <cursor>
```

### Find first matching resourceObservedStorage

```bash
csdk resource-observed-storage find-first --where.id.equalTo <value>
```

### List resourceObservedStorage records with field selection

```bash
csdk resource-observed-storage list --select id,id
```

### List resourceObservedStorage records with filtering and ordering

```bash
csdk resource-observed-storage list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceObservedStorage

```bash
csdk resource-observed-storage create --capacity <String> --capacityBytes <BigInt> --claimName <String> --declaredStorageClass <String> --declaredStorageSizeBytes <BigInt> --declaredStorageTotalBytes <BigInt> --installationId <UUID> --isBound <Boolean> --kind <String> --namespaceId <UUID> --phase <String> --requested <String> --requestedBytes <BigInt> --resourceId <UUID> --resourceStatus <String> --slug <String> --storageClass <String> --storageName <String>
```

### Get a resourceObservedStorage by id

```bash
csdk resource-observed-storage get --id <value>
```
