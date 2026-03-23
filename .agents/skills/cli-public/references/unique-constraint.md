# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UniqueConstraint records via csdk CLI

## Usage

```bash
csdk unique-constraint list
csdk unique-constraint get --id <UUID>
csdk unique-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk unique-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--fieldIds <UUID>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk unique-constraint delete --id <UUID>
```

## Examples

### List all uniqueConstraint records

```bash
csdk unique-constraint list
```

### Create a uniqueConstraint

```bash
csdk unique-constraint create --tableId <UUID> --fieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a uniqueConstraint by id

```bash
csdk unique-constraint get --id <value>
```
