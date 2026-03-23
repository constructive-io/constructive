# rlsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RlsModule records via csdk CLI

## Usage

```bash
csdk rls-module list
csdk rls-module get --id <UUID>
csdk rls-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
csdk rls-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
csdk rls-module delete --id <UUID>
```

## Examples

### List all rlsModule records

```bash
csdk rls-module list
```

### Create a rlsModule

```bash
csdk rls-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>] [--authenticate <String>] [--authenticateStrict <String>] [--currentRole <String>] [--currentRoleId <String>]
```

### Get a rlsModule by id

```bash
csdk rls-module get --id <value>
```
