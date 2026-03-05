# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Commit records via app CLI

## Usage

```bash
app commit list
app commit get --id <value>
app commit create --message <value> --databaseId <value> --storeId <value> --parentIds <value> --authorId <value> --committerId <value> --treeId <value> --date <value>
app commit update --id <value> [--message <value>] [--databaseId <value>] [--storeId <value>] [--parentIds <value>] [--authorId <value>] [--committerId <value>] [--treeId <value>] [--date <value>]
app commit delete --id <value>
```

## Examples

### List all commit records

```bash
app commit list
```

### Create a commit

```bash
app commit create --message "value" --databaseId "value" --storeId "value" --parentIds "value" --authorId "value" --committerId "value" --treeId "value" --date "value"
```

### Get a commit by id

```bash
app commit get --id <value>
```
