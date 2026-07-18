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
csdk realtime-module create --databaseId <UUID> [--apiName <String>] [--changeLogTableId <UUID>] [--interval <String>] [--listenerNodeTableId <UUID>] [--notifyChannel <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--retentionHours <Int>] [--schemaId <UUID>] [--sourceRegistryTableId <UUID>] [--subscriptionsSchemaId <UUID>]
csdk realtime-module update --id <UUID> [--apiName <String>] [--changeLogTableId <UUID>] [--databaseId <UUID>] [--interval <String>] [--listenerNodeTableId <UUID>] [--notifyChannel <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--retentionHours <Int>] [--schemaId <UUID>] [--sourceRegistryTableId <UUID>] [--subscriptionsSchemaId <UUID>]
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
csdk realtime-module create --databaseId <UUID> [--apiName <String>] [--changeLogTableId <UUID>] [--interval <String>] [--listenerNodeTableId <UUID>] [--notifyChannel <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--retentionHours <Int>] [--schemaId <UUID>] [--sourceRegistryTableId <UUID>] [--subscriptionsSchemaId <UUID>]
```

### Get a realtimeModule by id

```bash
csdk realtime-module get --id <value>
```
