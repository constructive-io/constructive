# foreignKeyConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ForeignKeyConstraint records via csdk CLI

## Usage

```bash
csdk foreign-key-constraint list
csdk foreign-key-constraint get --id <value>
csdk foreign-key-constraint create --tableId <value> --fieldIds <value> --refTableId <value> --refFieldIds <value> [--databaseId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--deleteAction <value>] [--updateAction <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk foreign-key-constraint update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--fieldIds <value>] [--refTableId <value>] [--refFieldIds <value>] [--deleteAction <value>] [--updateAction <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk foreign-key-constraint delete --id <value>
```

## Examples

### List all foreignKeyConstraint records

```bash
csdk foreign-key-constraint list
```

### Create a foreignKeyConstraint

```bash
csdk foreign-key-constraint create --tableId <value> --fieldIds <value> --refTableId <value> --refFieldIds <value> [--databaseId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--deleteAction <value>] [--updateAction <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
```

### Get a foreignKeyConstraint by id

```bash
csdk foreign-key-constraint get --id <value>
```
