# namespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for NamespaceEvent records via csdk CLI

## Usage

```bash
csdk namespace-event list
csdk namespace-event list --where.<field>.<op> <value> --orderBy <values>
csdk namespace-event list --limit 10 --after <cursor>
csdk namespace-event find-first --where.<field>.<op> <value>
csdk namespace-event get --id <UUID>
csdk namespace-event create --namespaceId <UUID> --eventType <String> --databaseId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>] [--cpuMillicores <Int>] [--memoryBytes <BigInt>] [--storageBytes <BigInt>] [--networkIngressBytes <BigInt>] [--networkEgressBytes <BigInt>] [--podCount <Int>] [--metrics <JSON>]
csdk namespace-event update --id <UUID> [--namespaceId <UUID>] [--eventType <String>] [--actorId <UUID>] [--message <String>] [--metadata <JSON>] [--cpuMillicores <Int>] [--memoryBytes <BigInt>] [--storageBytes <BigInt>] [--networkIngressBytes <BigInt>] [--networkEgressBytes <BigInt>] [--podCount <Int>] [--metrics <JSON>] [--databaseId <UUID>]
csdk namespace-event delete --id <UUID>
```

## Examples

### List namespaceEvent records

```bash
csdk namespace-event list
```

### List namespaceEvent records with pagination

```bash
csdk namespace-event list --limit 10 --offset 0
```

### List namespaceEvent records with cursor pagination

```bash
csdk namespace-event list --limit 10 --after <cursor>
```

### Find first matching namespaceEvent

```bash
csdk namespace-event find-first --where.id.equalTo <value>
```

### List namespaceEvent records with field selection

```bash
csdk namespace-event list --select id,id
```

### List namespaceEvent records with filtering and ordering

```bash
csdk namespace-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a namespaceEvent

```bash
csdk namespace-event create --namespaceId <UUID> --eventType <String> --databaseId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>] [--cpuMillicores <Int>] [--memoryBytes <BigInt>] [--storageBytes <BigInt>] [--networkIngressBytes <BigInt>] [--networkEgressBytes <BigInt>] [--podCount <Int>] [--metrics <JSON>]
```

### Get a namespaceEvent by id

```bash
csdk namespace-event get --id <value>
```
