# uniqueConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UniqueConstraint records via csdk CLI

## Usage

```bash
csdk unique-constraint list
csdk unique-constraint get --id <value>
csdk unique-constraint create --tableId <value> --fieldIds <value> [--databaseId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk unique-constraint update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--fieldIds <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk unique-constraint delete --id <value>
```

## Examples

### List all uniqueConstraint records

```bash
csdk unique-constraint list
```

### Create a uniqueConstraint

```bash
csdk unique-constraint create --tableId <value> --fieldIds <value> [--databaseId <value>] [--name <value>] [--description <value>] [--smartTags <value>] [--type <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
```

### Get a uniqueConstraint by id

```bash
csdk unique-constraint get --id <value>
```
