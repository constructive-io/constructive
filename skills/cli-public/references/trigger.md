# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Trigger records via app CLI

## Usage

```bash
app trigger list
app trigger get --id <value>
app trigger create --databaseId <value> --tableId <value> --name <value> --event <value> --functionName <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value>
app trigger update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--event <value>] [--functionName <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
app trigger delete --id <value>
```

## Examples

### List all trigger records

```bash
app trigger list
```

### Create a trigger

```bash
app trigger create --databaseId "value" --tableId "value" --name "value" --event "value" --functionName "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value"
```

### Get a trigger by id

```bash
app trigger get --id <value>
```
