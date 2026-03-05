# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Table records via csdk CLI

## Usage

```bash
csdk table list
csdk table get --id <value>
csdk table create --databaseId <value> --schemaId <value> --name <value> --label <value> --description <value> --smartTags <value> --category <value> --module <value> --scope <value> --useRls <value> --timestamps <value> --peoplestamps <value> --pluralName <value> --singularName <value> --tags <value> --inheritsId <value>
csdk table update --id <value> [--databaseId <value>] [--schemaId <value>] [--name <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--useRls <value>] [--timestamps <value>] [--peoplestamps <value>] [--pluralName <value>] [--singularName <value>] [--tags <value>] [--inheritsId <value>]
csdk table delete --id <value>
```

## Examples

### List all table records

```bash
csdk table list
```

### Create a table

```bash
csdk table create --databaseId "value" --schemaId "value" --name "value" --label "value" --description "value" --smartTags "value" --category "value" --module "value" --scope "value" --useRls "value" --timestamps "value" --peoplestamps "value" --pluralName "value" --singularName "value" --tags "value" --inheritsId "value"
```

### Get a table by id

```bash
csdk table get --id <value>
```
