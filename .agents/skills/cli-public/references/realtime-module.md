# realtimeModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RealtimeModule records via csdk CLI

## Usage

```bash
csdk realtime-module list
csdk realtime-module list --where.<field>.<op> <value> --orderBy <values>
csdk realtime-module list --limit 10 --after <cursor>
csdk realtime-module find-first --where.<field>.<op> <value>
csdk realtime-module get --id <UUID>
csdk realtime-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--subscriptionsSchemaId <UUID>] [--changeLogTableId <UUID>] [--listenerNodeTableId <UUID>] [--sourceRegistryTableId <UUID>] [--retentionHours <Int>] [--premake <Int>] [--interval <String>] [--notifyChannel <String>]
csdk realtime-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--subscriptionsSchemaId <UUID>] [--changeLogTableId <UUID>] [--listenerNodeTableId <UUID>] [--sourceRegistryTableId <UUID>] [--retentionHours <Int>] [--premake <Int>] [--interval <String>] [--notifyChannel <String>]
csdk realtime-module delete --id <UUID>
```

## Examples

### List realtimeModule records

```bash
csdk realtime-module list
```

### List realtimeModule records with pagination

```bash
csdk realtime-module list --limit 10 --offset 0
```

### List realtimeModule records with cursor pagination

```bash
csdk realtime-module list --limit 10 --after <cursor>
```

### Find first matching realtimeModule

```bash
csdk realtime-module find-first --where.id.equalTo <value>
```

### List realtimeModule records with field selection

```bash
csdk realtime-module list --select id,id
```

### List realtimeModule records with filtering and ordering

```bash
csdk realtime-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a realtimeModule

```bash
csdk realtime-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--subscriptionsSchemaId <UUID>] [--changeLogTableId <UUID>] [--listenerNodeTableId <UUID>] [--sourceRegistryTableId <UUID>] [--retentionHours <Int>] [--premake <Int>] [--interval <String>] [--notifyChannel <String>]
```

### Get a realtimeModule by id

```bash
csdk realtime-module get --id <value>
```
