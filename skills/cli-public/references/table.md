# table

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Table records via app CLI

## Usage

```bash
app table list
app table get --id <value>
app table create --databaseId <value> --schemaId <value> --name <value> --label <value> --description <value> --smartTags <value> --category <value> --module <value> --scope <value> --useRls <value> --timestamps <value> --peoplestamps <value> --pluralName <value> --singularName <value> --tags <value> --inheritsId <value>
app table update --id <value> [--databaseId <value>] [--schemaId <value>] [--name <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--useRls <value>] [--timestamps <value>] [--peoplestamps <value>] [--pluralName <value>] [--singularName <value>] [--tags <value>] [--inheritsId <value>]
app table delete --id <value>
```

## Examples

### List all table records

```bash
app table list
```

### Create a table

```bash
app table create --databaseId "value" --schemaId "value" --name "value" --label "value" --description "value" --smartTags "value" --category "value" --module "value" --scope "value" --useRls "value" --timestamps "value" --peoplestamps "value" --pluralName "value" --singularName "value" --tags "value" --inheritsId "value"
```

### Get a table by id

```bash
app table get --id <value>
```
