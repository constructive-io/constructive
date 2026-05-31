# devicesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DevicesModule records via csdk CLI

## Usage

```bash
csdk devices-module list
csdk devices-module list --where.<field>.<op> <value> --orderBy <values>
csdk devices-module list --limit 10 --after <cursor>
csdk devices-module find-first --where.<field>.<op> <value>
csdk devices-module get --id <UUID>
csdk devices-module create --databaseId <UUID> [--schemaId <UUID>] [--userDevicesTableId <UUID>] [--deviceSettingsTableId <UUID>] [--userDevicesTable <String>] [--deviceSettingsTable <String>]
csdk devices-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--userDevicesTableId <UUID>] [--deviceSettingsTableId <UUID>] [--userDevicesTable <String>] [--deviceSettingsTable <String>]
csdk devices-module delete --id <UUID>
```

## Examples

### List devicesModule records

```bash
csdk devices-module list
```

### List devicesModule records with pagination

```bash
csdk devices-module list --limit 10 --offset 0
```

### List devicesModule records with cursor pagination

```bash
csdk devices-module list --limit 10 --after <cursor>
```

### Find first matching devicesModule

```bash
csdk devices-module find-first --where.id.equalTo <value>
```

### List devicesModule records with field selection

```bash
csdk devices-module list --select id,id
```

### List devicesModule records with filtering and ordering

```bash
csdk devices-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a devicesModule

```bash
csdk devices-module create --databaseId <UUID> [--schemaId <UUID>] [--userDevicesTableId <UUID>] [--deviceSettingsTableId <UUID>] [--userDevicesTable <String>] [--deviceSettingsTable <String>]
```

### Get a devicesModule by id

```bash
csdk devices-module get --id <value>
```
