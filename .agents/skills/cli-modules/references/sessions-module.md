# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SessionsModule records via csdk CLI

## Usage

```bash
csdk sessions-module list
csdk sessions-module list --where.<field>.<op> <value> --orderBy <values>
csdk sessions-module list --limit 10 --after <cursor>
csdk sessions-module find-first --where.<field>.<op> <value>
csdk sessions-module get --id <UUID>
csdk sessions-module create --databaseId <UUID> [--authSettingsTableId <UUID>] [--authSettingsTableName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionCredentialsTableName <String>] [--sessionsDefaultExpiration <Interval>] [--sessionsTableId <UUID>] [--sessionsTableName <String>] [--usersTableId <UUID>]
csdk sessions-module update --id <UUID> [--authSettingsTableId <UUID>] [--authSettingsTableName <String>] [--databaseId <UUID>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionCredentialsTableName <String>] [--sessionsDefaultExpiration <Interval>] [--sessionsTableId <UUID>] [--sessionsTableName <String>] [--usersTableId <UUID>]
csdk sessions-module delete --id <UUID>
```

## Examples

### List sessionsModule records

```bash
csdk sessions-module list
```

### List sessionsModule records with pagination

```bash
csdk sessions-module list --limit 10 --offset 0
```

### List sessionsModule records with cursor pagination

```bash
csdk sessions-module list --limit 10 --after <cursor>
```

### Find first matching sessionsModule

```bash
csdk sessions-module find-first --where.id.equalTo <value>
```

### List sessionsModule records with field selection

```bash
csdk sessions-module list --select id,id
```

### List sessionsModule records with filtering and ordering

```bash
csdk sessions-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a sessionsModule

```bash
csdk sessions-module create --databaseId <UUID> [--authSettingsTableId <UUID>] [--authSettingsTableName <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionCredentialsTableName <String>] [--sessionsDefaultExpiration <Interval>] [--sessionsTableId <UUID>] [--sessionsTableName <String>] [--usersTableId <UUID>]
```

### Get a sessionsModule by id

```bash
csdk sessions-module get --id <value>
```
