# primaryKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrimaryKeyConstraint records via csdk CLI

## Usage

```bash
csdk primary-key-constraint list
csdk primary-key-constraint get --id <UUID>
csdk primary-key-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk primary-key-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--type <String>] [--fieldIds <UUID>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk primary-key-constraint delete --id <UUID>
```

## Examples

### List all primaryKeyConstraint records

```bash
csdk primary-key-constraint list
```

### Create a primaryKeyConstraint

```bash
csdk primary-key-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a primaryKeyConstraint by id

```bash
csdk primary-key-constraint get --id <value>
```
