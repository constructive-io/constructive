# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for View records via csdk CLI

## Usage

```bash
csdk view list
csdk view get --id <value>
csdk view create --databaseId <value> --schemaId <value> --name <value> --tableId <value> --viewType <value> --data <value> --filterType <value> --filterData <value> --securityInvoker <value> --isReadOnly <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value>
csdk view update --id <value> [--databaseId <value>] [--schemaId <value>] [--name <value>] [--tableId <value>] [--viewType <value>] [--data <value>] [--filterType <value>] [--filterData <value>] [--securityInvoker <value>] [--isReadOnly <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk view delete --id <value>
```

## Examples

### List all view records

```bash
csdk view list
```

### Create a view

```bash
csdk view create --databaseId "value" --schemaId "value" --name "value" --tableId "value" --viewType "value" --data "value" --filterType "value" --filterData "value" --securityInvoker "value" --isReadOnly "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value"
```

### Get a view by id

```bash
csdk view get --id <value>
```
