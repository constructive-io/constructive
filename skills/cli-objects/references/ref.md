# ref

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Ref records via app CLI

## Usage

```bash
app ref list
app ref get --id <value>
app ref create --name <value> --databaseId <value> --storeId <value> --commitId <value>
app ref update --id <value> [--name <value>] [--databaseId <value>] [--storeId <value>] [--commitId <value>]
app ref delete --id <value>
```

## Examples

### List all ref records

```bash
app ref list
```

### Create a ref

```bash
app ref create --name "value" --databaseId "value" --storeId "value" --commitId "value"
```

### Get a ref by id

```bash
app ref get --id <value>
```
