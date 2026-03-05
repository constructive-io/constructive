# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableGrant records via app CLI

## Usage

```bash
app table-grant list
app table-grant get --id <value>
app table-grant create --databaseId <value> --tableId <value> --privilege <value> --granteeName <value> --fieldIds <value> --isGrant <value>
app table-grant update --id <value> [--databaseId <value>] [--tableId <value>] [--privilege <value>] [--granteeName <value>] [--fieldIds <value>] [--isGrant <value>]
app table-grant delete --id <value>
```

## Examples

### List all tableGrant records

```bash
app table-grant list
```

### Create a tableGrant

```bash
app table-grant create --databaseId "value" --tableId "value" --privilege "value" --granteeName "value" --fieldIds "value" --isGrant "value"
```

### Get a tableGrant by id

```bash
app table-grant get --id <value>
```
