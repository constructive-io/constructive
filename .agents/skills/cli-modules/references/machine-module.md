# machineModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MachineModule records via csdk CLI

## Usage

```bash
csdk machine-module list
csdk machine-module list --where.<field>.<op> <value> --orderBy <values>
csdk machine-module list --limit 10 --after <cursor>
csdk machine-module find-first --where.<field>.<op> <value>
csdk machine-module get --id <UUID>
csdk machine-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--machineMessagesTableId <UUID>] [--machineMessagesTableName <String>] [--machineSessionsTableId <UUID>] [--machineSessionsTableName <String>] [--machinesTableId <UUID>] [--machinesTableName <String>] [--partitionInterval <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>]
csdk machine-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--machineMessagesTableId <UUID>] [--machineMessagesTableName <String>] [--machineSessionsTableId <UUID>] [--machineSessionsTableName <String>] [--machinesTableId <UUID>] [--machinesTableName <String>] [--partitionInterval <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>] [--scope <String>]
csdk machine-module delete --id <UUID>
```

## Examples

### List machineModule records

```bash
csdk machine-module list
```

### List machineModule records with pagination

```bash
csdk machine-module list --limit 10 --offset 0
```

### List machineModule records with cursor pagination

```bash
csdk machine-module list --limit 10 --after <cursor>
```

### Find first matching machineModule

```bash
csdk machine-module find-first --where.id.equalTo <value>
```

### List machineModule records with field selection

```bash
csdk machine-module list --select id,id
```

### List machineModule records with filtering and ordering

```bash
csdk machine-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a machineModule

```bash
csdk machine-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--machineMessagesTableId <UUID>] [--machineMessagesTableName <String>] [--machineSessionsTableId <UUID>] [--machineSessionsTableName <String>] [--machinesTableId <UUID>] [--machinesTableName <String>] [--partitionInterval <String>] [--policies <JSON>] [--prefix <String>] [--premake <Int>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--retention <String>] [--schemaId <UUID>]
```

### Get a machineModule by id

```bash
csdk machine-module get --id <value>
```
