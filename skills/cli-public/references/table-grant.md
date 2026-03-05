# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableGrant records via csdk CLI

## Usage

```bash
csdk table-grant list
csdk table-grant get --id <value>
csdk table-grant create --databaseId <value> --tableId <value> --privilege <value> --granteeName <value> --fieldIds <value> --isGrant <value>
csdk table-grant update --id <value> [--databaseId <value>] [--tableId <value>] [--privilege <value>] [--granteeName <value>] [--fieldIds <value>] [--isGrant <value>]
csdk table-grant delete --id <value>
```

## Examples

### List all tableGrant records

```bash
csdk table-grant list
```

### Create a tableGrant

```bash
csdk table-grant create --databaseId "value" --tableId "value" --privilege "value" --granteeName "value" --fieldIds "value" --isGrant "value"
```

### Get a tableGrant by id

```bash
csdk table-grant get --id <value>
```
