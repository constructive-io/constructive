# database

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Database records via app CLI

## Usage

```bash
app database list
app database get --id <value>
app database create --ownerId <value> --schemaHash <value> --name <value> --label <value> --hash <value>
app database update --id <value> [--ownerId <value>] [--schemaHash <value>] [--name <value>] [--label <value>] [--hash <value>]
app database delete --id <value>
```

## Examples

### List all database records

```bash
app database list
```

### Create a database

```bash
app database create --ownerId "value" --schemaHash "value" --name "value" --label "value" --hash "value"
```

### Get a database by id

```bash
app database get --id <value>
```
