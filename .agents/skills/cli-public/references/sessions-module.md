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
csdk sessions-module create --databaseId <UUID> [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
csdk sessions-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
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
csdk sessions-module create --databaseId <UUID> [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
```

### Get a sessionsModule by id

```bash
csdk sessions-module get --id <value>
```
