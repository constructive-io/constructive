# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Schema records via app CLI

## Usage

```bash
app schema list
app schema get --id <value>
app schema create --databaseId <value> --name <value> --schemaName <value> --label <value> --description <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value> --isPublic <value>
app schema update --id <value> [--databaseId <value>] [--name <value>] [--schemaName <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--isPublic <value>]
app schema delete --id <value>
```

## Examples

### List all schema records

```bash
app schema list
```

### Create a schema

```bash
app schema create --databaseId "value" --name "value" --schemaName "value" --label "value" --description "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value" --isPublic "value"
```

### Get a schema by id

```bash
app schema get --id <value>
```
