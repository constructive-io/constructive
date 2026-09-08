# clusterModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ClusterModule records via csdk CLI

## Usage

```bash
csdk cluster-module list
csdk cluster-module list --where.<field>.<op> <value> --orderBy <values>
csdk cluster-module list --limit 10 --after <cursor>
csdk cluster-module find-first --where.<field>.<op> <value>
csdk cluster-module get --id <UUID>
csdk cluster-module create --databaseId <UUID> [--apiName <String>] [--clusterEventsTableId <UUID>] [--clusterEventsTableName <String>] [--clustersTableId <UUID>] [--clustersTableName <String>] [--databasePlacementsTableId <UUID>] [--databasePlacementsTableName <String>] [--databaseServersTableId <UUID>] [--databaseServersTableName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--partitionInterval <String>] [--physicalDatabasesTableId <UUID>] [--physicalDatabasesTableName <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>]
csdk cluster-module update --id <UUID> [--apiName <String>] [--clusterEventsTableId <UUID>] [--clusterEventsTableName <String>] [--clustersTableId <UUID>] [--clustersTableName <String>] [--databaseId <UUID>] [--databasePlacementsTableId <UUID>] [--databasePlacementsTableName <String>] [--databaseServersTableId <UUID>] [--databaseServersTableName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--partitionInterval <String>] [--physicalDatabasesTableId <UUID>] [--physicalDatabasesTableName <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>]
csdk cluster-module delete --id <UUID>
```

## Examples

### List clusterModule records

```bash
csdk cluster-module list
```

### List clusterModule records with pagination

```bash
csdk cluster-module list --limit 10 --offset 0
```

### List clusterModule records with cursor pagination

```bash
csdk cluster-module list --limit 10 --after <cursor>
```

### Find first matching clusterModule

```bash
csdk cluster-module find-first --where.id.equalTo <value>
```

### List clusterModule records with field selection

```bash
csdk cluster-module list --select id,id
```

### List clusterModule records with filtering and ordering

```bash
csdk cluster-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a clusterModule

```bash
csdk cluster-module create --databaseId <UUID> [--apiName <String>] [--clusterEventsTableId <UUID>] [--clusterEventsTableName <String>] [--clustersTableId <UUID>] [--clustersTableName <String>] [--databasePlacementsTableId <UUID>] [--databasePlacementsTableName <String>] [--databaseServersTableId <UUID>] [--databaseServersTableName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--partitionInterval <String>] [--physicalDatabasesTableId <UUID>] [--physicalDatabasesTableName <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a clusterModule by id

```bash
csdk cluster-module get --id <value>
```
