# trigger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Trigger records via csdk CLI

## Usage

```bash
csdk trigger list
csdk trigger get --id <UUID>
csdk trigger create --tableId <UUID> --name <String> [--databaseId <UUID>] [--event <String>] [--functionName <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk trigger update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--event <String>] [--functionName <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk trigger delete --id <UUID>
```

## Examples

### List all trigger records

```bash
csdk trigger list
```

### Create a trigger

```bash
csdk trigger create --tableId <UUID> --name <String> [--databaseId <UUID>] [--event <String>] [--functionName <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a trigger by id

```bash
csdk trigger get --id <value>
```
