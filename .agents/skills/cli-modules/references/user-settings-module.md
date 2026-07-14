# userSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserSettingsModule records via csdk CLI

## Usage

```bash
csdk user-settings-module list
csdk user-settings-module list --where.<field>.<op> <value> --orderBy <values>
csdk user-settings-module list --limit 10 --after <cursor>
csdk user-settings-module find-first --where.<field>.<op> <value>
csdk user-settings-module get --id <UUID>
csdk user-settings-module create --databaseId <UUID> [--apiName <String>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-settings-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-settings-module delete --id <UUID>
```

## Examples

### List userSettingsModule records

```bash
csdk user-settings-module list
```

### List userSettingsModule records with pagination

```bash
csdk user-settings-module list --limit 10 --offset 0
```

### List userSettingsModule records with cursor pagination

```bash
csdk user-settings-module list --limit 10 --after <cursor>
```

### Find first matching userSettingsModule

```bash
csdk user-settings-module find-first --where.id.equalTo <value>
```

### List userSettingsModule records with field selection

```bash
csdk user-settings-module list --select id,id
```

### List userSettingsModule records with filtering and ordering

```bash
csdk user-settings-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userSettingsModule

```bash
csdk user-settings-module create --databaseId <UUID> [--apiName <String>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a userSettingsModule by id

```bash
csdk user-settings-module get --id <value>
```
