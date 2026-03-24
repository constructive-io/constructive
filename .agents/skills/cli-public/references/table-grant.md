# tableGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TableGrant records via csdk CLI

## Usage

```bash
csdk table-grant list
csdk table-grant get --id <UUID>
csdk table-grant create --tableId <UUID> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--fieldIds <UUID>] [--isGrant <Boolean>]
csdk table-grant update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--privilege <String>] [--granteeName <String>] [--fieldIds <UUID>] [--isGrant <Boolean>]
csdk table-grant delete --id <UUID>
```

## Examples

### List all tableGrant records

```bash
csdk table-grant list
```

### Create a tableGrant

```bash
csdk table-grant create --tableId <UUID> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--fieldIds <UUID>] [--isGrant <Boolean>]
```

### Get a tableGrant by id

```bash
csdk table-grant get --id <value>
```
