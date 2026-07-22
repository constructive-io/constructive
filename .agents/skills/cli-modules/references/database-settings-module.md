# databaseSettingsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseSettingsModule records via csdk CLI

## Usage

```bash
csdk database-settings-module list
csdk database-settings-module list --where.<field>.<op> <value> --orderBy <values>
csdk database-settings-module list --limit 10 --after <cursor>
csdk database-settings-module find-first --where.<field>.<op> <value>
csdk database-settings-module get --id <UUID>
csdk database-settings-module create --databaseId <UUID> [--apiName <String>] [--databaseSettingsTableId <UUID>] [--databaseSettingsTableName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--pubkeySettingsTableId <UUID>] [--pubkeySettingsTableName <String>] [--publicSchemaName <String>] [--rlsSettingsTableId <UUID>] [--rlsSettingsTableName <String>] [--schemaId <UUID>] [--scope <String>] [--webauthnSettingsTableId <UUID>] [--webauthnSettingsTableName <String>]
csdk database-settings-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--databaseSettingsTableId <UUID>] [--databaseSettingsTableName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--pubkeySettingsTableId <UUID>] [--pubkeySettingsTableName <String>] [--publicSchemaName <String>] [--rlsSettingsTableId <UUID>] [--rlsSettingsTableName <String>] [--schemaId <UUID>] [--scope <String>] [--webauthnSettingsTableId <UUID>] [--webauthnSettingsTableName <String>]
csdk database-settings-module delete --id <UUID>
```

## Examples

### List databaseSettingsModule records

```bash
csdk database-settings-module list
```

### List databaseSettingsModule records with pagination

```bash
csdk database-settings-module list --limit 10 --offset 0
```

### List databaseSettingsModule records with cursor pagination

```bash
csdk database-settings-module list --limit 10 --after <cursor>
```

### Find first matching databaseSettingsModule

```bash
csdk database-settings-module find-first --where.id.equalTo <value>
```

### List databaseSettingsModule records with field selection

```bash
csdk database-settings-module list --select id,id
```

### List databaseSettingsModule records with filtering and ordering

```bash
csdk database-settings-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseSettingsModule

```bash
csdk database-settings-module create --databaseId <UUID> [--apiName <String>] [--databaseSettingsTableId <UUID>] [--databaseSettingsTableName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--pubkeySettingsTableId <UUID>] [--pubkeySettingsTableName <String>] [--publicSchemaName <String>] [--rlsSettingsTableId <UUID>] [--rlsSettingsTableName <String>] [--schemaId <UUID>] [--scope <String>] [--webauthnSettingsTableId <UUID>] [--webauthnSettingsTableName <String>]
```

### Get a databaseSettingsModule by id

```bash
csdk database-settings-module get --id <value>
```
