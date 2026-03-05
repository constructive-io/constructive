# index

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Index records via csdk CLI

## Usage

```bash
csdk index list
csdk index get --id <value>
csdk index create --databaseId <value> --tableId <value> --name <value> --fieldIds <value> --includeFieldIds <value> --accessMethod <value> --indexParams <value> --whereClause <value> --isUnique <value> --smartTags <value> --category <value> --module <value> --scope <value> --tags <value>
csdk index update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--fieldIds <value>] [--includeFieldIds <value>] [--accessMethod <value>] [--indexParams <value>] [--whereClause <value>] [--isUnique <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk index delete --id <value>
```

## Examples

### List all index records

```bash
csdk index list
```

### Create a index

```bash
csdk index create --databaseId "value" --tableId "value" --name "value" --fieldIds "value" --includeFieldIds "value" --accessMethod "value" --indexParams "value" --whereClause "value" --isUnique "value" --smartTags "value" --category "value" --module "value" --scope "value" --tags "value"
```

### Get a index by id

```bash
csdk index get --id <value>
```
