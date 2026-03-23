# tableTemplateModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableTemplateModule records via csdk CLI

## Usage

```bash
csdk table-template-module list
csdk table-template-module get --id <UUID>
csdk table-template-module create --databaseId <UUID> --tableName <String> --nodeType <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--data <JSON>]
csdk table-template-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--tableName <String>] [--nodeType <String>] [--data <JSON>]
csdk table-template-module delete --id <UUID>
```

## Examples

### List all tableTemplateModule records

```bash
csdk table-template-module list
```

### Create a tableTemplateModule

```bash
csdk table-template-module create --databaseId <UUID> --tableName <String> --nodeType <String> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--ownerTableId <UUID>] [--data <JSON>]
```

### Get a tableTemplateModule by id

```bash
csdk table-template-module get --id <value>
```
