# viewGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewGrant records via csdk CLI

## Usage

```bash
csdk view-grant list
csdk view-grant get --id <UUID>
csdk view-grant create --viewId <UUID> --granteeName <String> --privilege <String> [--databaseId <UUID>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
csdk view-grant update --id <UUID> [--databaseId <UUID>] [--viewId <UUID>] [--granteeName <String>] [--privilege <String>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
csdk view-grant delete --id <UUID>
```

## Examples

### List all viewGrant records

```bash
csdk view-grant list
```

### Create a viewGrant

```bash
csdk view-grant create --viewId <UUID> --granteeName <String> --privilege <String> [--databaseId <UUID>] [--withGrantOption <Boolean>] [--isGrant <Boolean>]
```

### Get a viewGrant by id

```bash
csdk view-grant get --id <value>
```
