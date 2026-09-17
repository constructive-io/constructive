# userSettingsSecurityModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserSettingsSecurityModule records via csdk CLI

## Usage

```bash
csdk user-settings-security-module list
csdk user-settings-security-module list --where.<field>.<op> <value> --orderBy <values>
csdk user-settings-security-module list --limit 10 --after <cursor>
csdk user-settings-security-module find-first --where.<field>.<op> <value>
csdk user-settings-security-module get --id <UUID>
csdk user-settings-security-module create --databaseId <UUID> [--apiName <String>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-settings-security-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
csdk user-settings-security-module delete --id <UUID>
```

## Examples

### List userSettingsSecurityModule records

```bash
csdk user-settings-security-module list
```

### List userSettingsSecurityModule records with pagination

```bash
csdk user-settings-security-module list --limit 10 --offset 0
```

### List userSettingsSecurityModule records with cursor pagination

```bash
csdk user-settings-security-module list --limit 10 --after <cursor>
```

### Find first matching userSettingsSecurityModule

```bash
csdk user-settings-security-module find-first --where.id.equalTo <value>
```

### List userSettingsSecurityModule records with field selection

```bash
csdk user-settings-security-module list --select id,id
```

### List userSettingsSecurityModule records with filtering and ordering

```bash
csdk user-settings-security-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userSettingsSecurityModule

```bash
csdk user-settings-security-module create --databaseId <UUID> [--apiName <String>] [--ownerTableId <UUID>] [--schemaId <UUID>] [--tableId <UUID>] [--tableName <String>]
```

### Get a userSettingsSecurityModule by id

```bash
csdk user-settings-security-module get --id <value>
```
