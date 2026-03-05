# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Index records via app CLI

## Usage

```bash
app index list
app index get --id <value>
app index create --databaseId <value> --tableId <value> --name <value> --fieldIds <value> --includeFieldIds <value> --accessMethod <value> --indexParams <value> --whereClause <value> --isUnique <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value>
app index update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--fieldIds <value>] [--includeFieldIds <value>] [--accessMethod <value>] [--indexParams <value>] [--whereClause <value>] [--isUnique <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
app index delete --id <value>
```

## Examples

### List all index records

```bash
app index list
```

### Create a index

```bash
app index create --databaseId "value" --tableId "value" --name "value" --fieldIds "value" --includeFieldIds "value" --accessMethod "value" --indexParams "value" --whereClause "value" --isUnique "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value"
```

### Get a index by id

```bash
app index get --id <value>
```
