# viewTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewTable records via csdk CLI

## Usage

```bash
csdk view-table list
csdk view-table get --id <UUID>
csdk view-table create --viewId <UUID> --tableId <UUID> [--joinOrder <Int>]
csdk view-table update --id <UUID> [--viewId <UUID>] [--tableId <UUID>] [--joinOrder <Int>]
csdk view-table delete --id <UUID>
```

## Examples

### List all viewTable records

```bash
csdk view-table list
```

### Create a viewTable

```bash
csdk view-table create --viewId <UUID> --tableId <UUID> [--joinOrder <Int>]
```

### Get a viewTable by id

```bash
csdk view-table get --id <value>
```
