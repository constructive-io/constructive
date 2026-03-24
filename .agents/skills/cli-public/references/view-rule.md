# viewRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ViewRule records via csdk CLI

## Usage

```bash
csdk view-rule list
csdk view-rule get --id <UUID>
csdk view-rule create --viewId <UUID> --name <String> --event <String> [--databaseId <UUID>] [--action <String>]
csdk view-rule update --id <UUID> [--databaseId <UUID>] [--viewId <UUID>] [--name <String>] [--event <String>] [--action <String>]
csdk view-rule delete --id <UUID>
```

## Examples

### List all viewRule records

```bash
csdk view-rule list
```

### Create a viewRule

```bash
csdk view-rule create --viewId <UUID> --name <String> --event <String> [--databaseId <UUID>] [--action <String>]
```

### Get a viewRule by id

```bash
csdk view-rule get --id <value>
```
