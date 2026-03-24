# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for View records via csdk CLI

## Usage

```bash
csdk view list
csdk view get --id <UUID>
csdk view create --schemaId <UUID> --name <String> --viewType <String> [--databaseId <UUID>] [--tableId <UUID>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk view update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--name <String>] [--tableId <UUID>] [--viewType <String>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk view delete --id <UUID>
```

## Examples

### List all view records

```bash
csdk view list
```

### Create a view

```bash
csdk view create --schemaId <UUID> --name <String> --viewType <String> [--databaseId <UUID>] [--tableId <UUID>] [--data <JSON>] [--filterType <String>] [--filterData <JSON>] [--securityInvoker <Boolean>] [--isReadOnly <Boolean>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a view by id

```bash
csdk view get --id <value>
```
