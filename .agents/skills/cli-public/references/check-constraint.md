# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CheckConstraint records via csdk CLI

## Usage

```bash
csdk check-constraint list
csdk check-constraint get --id <UUID>
csdk check-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk check-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--type <String>] [--fieldIds <UUID>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk check-constraint delete --id <UUID>
```

## Examples

### List all checkConstraint records

```bash
csdk check-constraint list
```

### Create a checkConstraint

```bash
csdk check-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--type <String>] [--expr <JSON>] [--smartTags <JSON>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a checkConstraint by id

```bash
csdk check-constraint get --id <value>
```
