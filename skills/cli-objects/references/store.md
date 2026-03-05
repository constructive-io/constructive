# store

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Store records via app CLI

## Usage

```bash
app store list
app store get --id <value>
app store create --name <value> --databaseId <value> --hash <value>
app store update --id <value> [--name <value>] [--databaseId <value>] [--hash <value>]
app store delete --id <value>
```

## Examples

### List all store records

```bash
app store list
```

### Create a store

```bash
app store create --name "value" --databaseId "value" --hash "value"
```

### Get a store by id

```bash
app store get --id <value>
```
