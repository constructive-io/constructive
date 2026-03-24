# sessionsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SessionsModule records via csdk CLI

## Usage

```bash
csdk sessions-module list
csdk sessions-module get --id <UUID>
csdk sessions-module create --databaseId <UUID> [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
csdk sessions-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
csdk sessions-module delete --id <UUID>
```

## Examples

### List all sessionsModule records

```bash
csdk sessions-module list
```

### Create a sessionsModule

```bash
csdk sessions-module create --databaseId <UUID> [--schemaId <UUID>] [--sessionsTableId <UUID>] [--sessionCredentialsTableId <UUID>] [--authSettingsTableId <UUID>] [--usersTableId <UUID>] [--sessionsDefaultExpiration <Interval>] [--sessionsTable <String>] [--sessionCredentialsTable <String>] [--authSettingsTable <String>]
```

### Get a sessionsModule by id

```bash
csdk sessions-module get --id <value>
```
