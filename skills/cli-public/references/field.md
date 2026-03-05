# field

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Field records via app CLI

## Usage

```bash
app field list
app field get --id <value>
app field create --databaseId <value> --tableId <value> --name <value> --label <value> --description <value> --smartTags <value> --isRequired <value> --defaultValue <value> --defaultValueAst <value> --isHidden <value> --type <value> --fieldOrder <value> --regexp <value> --chk <value> --chkExpr <value> --min <value> --max <value> --tags <value> --category <value> --module <value> --scope <value>
app field update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--label <value>] [--description <value>] [--smartTags <value>] [--isRequired <value>] [--defaultValue <value>] [--defaultValueAst <value>] [--isHidden <value>] [--type <value>] [--fieldOrder <value>] [--regexp <value>] [--chk <value>] [--chkExpr <value>] [--min <value>] [--max <value>] [--tags <value>] [--category <value>] [--module <value>] [--scope <value>]
app field delete --id <value>
```

## Examples

### List all field records

```bash
app field list
```

### Create a field

```bash
app field create --databaseId "value" --tableId "value" --name "value" --label "value" --description "value" --smartTags "value" --isRequired "value" --defaultValue "value" --defaultValueAst "value" --isHidden "value" --type "value" --fieldOrder "value" --regexp "value" --chk "value" --chkExpr "value" --min "value" --max "value" --tags "value" --category "value" --module "value" --scope "value"
```

### Get a field by id

```bash
app field get --id <value>
```
