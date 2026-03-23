# fieldModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FieldModule records via csdk CLI

## Usage

```bash
csdk field-module list
csdk field-module get --id <UUID>
csdk field-module create --databaseId <UUID> --nodeType <String> [--privateSchemaId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--data <JSON>] [--triggers <String>] [--functions <String>]
csdk field-module update --id <UUID> [--databaseId <UUID>] [--privateSchemaId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--nodeType <String>] [--data <JSON>] [--triggers <String>] [--functions <String>]
csdk field-module delete --id <UUID>
```

## Examples

### List all fieldModule records

```bash
csdk field-module list
```

### Create a fieldModule

```bash
csdk field-module create --databaseId <UUID> --nodeType <String> [--privateSchemaId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--data <JSON>] [--triggers <String>] [--functions <String>]
```

### Get a fieldModule by id

```bash
csdk field-module get --id <value>
```
