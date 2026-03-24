# limitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for LimitsModule records via csdk CLI

## Usage

```bash
csdk limits-module list
csdk limits-module get --id <UUID>
csdk limits-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk limits-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--membershipType <Int>] [--entityTableId <UUID>] [--actorTableId <UUID>]
csdk limits-module delete --id <UUID>
```

## Examples

### List all limitsModule records

```bash
csdk limits-module list
```

### Create a limitsModule

```bash
csdk limits-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--tableName <String>] [--defaultTableId <UUID>] [--defaultTableName <String>] [--limitIncrementFunction <String>] [--limitDecrementFunction <String>] [--limitIncrementTrigger <String>] [--limitDecrementTrigger <String>] [--limitUpdateTrigger <String>] [--limitCheckFunction <String>] [--prefix <String>] [--entityTableId <UUID>] [--actorTableId <UUID>]
```

### Get a limitsModule by id

```bash
csdk limits-module get --id <value>
```
