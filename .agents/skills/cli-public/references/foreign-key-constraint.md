# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ForeignKeyConstraint records via csdk CLI

## Usage

```bash
csdk foreign-key-constraint list
csdk foreign-key-constraint get --id <UUID>
csdk foreign-key-constraint create --tableId <UUID> --fieldIds <UUID> --refTableId <UUID> --refFieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk foreign-key-constraint update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--fieldIds <UUID>] [--refTableId <UUID>] [--refFieldIds <UUID>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk foreign-key-constraint delete --id <UUID>
```

## Examples

### List all foreignKeyConstraint records

```bash
csdk foreign-key-constraint list
```

### Create a foreignKeyConstraint

```bash
csdk foreign-key-constraint create --tableId <UUID> --fieldIds <UUID> --refTableId <UUID> --refFieldIds <UUID> [--databaseId <UUID>] [--name <String>] [--description <String>] [--smartTags <JSON>] [--type <String>] [--deleteAction <String>] [--updateAction <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a foreignKeyConstraint by id

```bash
csdk foreign-key-constraint get --id <value>
```
