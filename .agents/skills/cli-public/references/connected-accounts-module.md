# connectedAccountsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ConnectedAccountsModule records via csdk CLI

## Usage

```bash
csdk connected-accounts-module list
csdk connected-accounts-module list --where.<field>.<op> <value> --orderBy <values>
csdk connected-accounts-module list --limit 10 --after <cursor>
csdk connected-accounts-module find-first --where.<field>.<op> <value>
csdk connected-accounts-module get --id <UUID>
csdk connected-accounts-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
csdk connected-accounts-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>]
csdk connected-accounts-module delete --id <UUID>
```

## Examples

### List connectedAccountsModule records

```bash
csdk connected-accounts-module list
```

### List connectedAccountsModule records with pagination

```bash
csdk connected-accounts-module list --limit 10 --offset 0
```

### List connectedAccountsModule records with cursor pagination

```bash
csdk connected-accounts-module list --limit 10 --after <cursor>
```

### Find first matching connectedAccountsModule

```bash
csdk connected-accounts-module find-first --where.id.equalTo <value>
```

### List connectedAccountsModule records with field selection

```bash
csdk connected-accounts-module list --select id,id
```

### List connectedAccountsModule records with filtering and ordering

```bash
csdk connected-accounts-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a connectedAccountsModule

```bash
csdk connected-accounts-module create --databaseId <UUID> --tableName <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>]
```

### Get a connectedAccountsModule by id

```bash
csdk connected-accounts-module get --id <value>
```
