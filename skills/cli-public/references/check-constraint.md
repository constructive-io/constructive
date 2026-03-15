# checkConstraint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CheckConstraint records via csdk CLI

## Usage

```bash
csdk check-constraint list
csdk check-constraint get --id <value>
csdk check-constraint create --tableId <value> --fieldIds <value> --nameTrgmSimilarity <value> --typeTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--name <value>] [--type <value>] [--expr <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
csdk check-constraint update --id <value> [--databaseId <value>] [--tableId <value>] [--name <value>] [--type <value>] [--fieldIds <value>] [--expr <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>] [--nameTrgmSimilarity <value>] [--typeTrgmSimilarity <value>] [--moduleTrgmSimilarity <value>] [--searchScore <value>]
csdk check-constraint delete --id <value>
```

## Examples

### List all checkConstraint records

```bash
csdk check-constraint list
```

### Create a checkConstraint

```bash
csdk check-constraint create --tableId <value> --fieldIds <value> --nameTrgmSimilarity <value> --typeTrgmSimilarity <value> --moduleTrgmSimilarity <value> --searchScore <value> [--databaseId <value>] [--name <value>] [--type <value>] [--expr <value>] [--smartTags <value>] [--category <value>] [--module <value>] [--scope <value>] [--tags <value>]
```

### Get a checkConstraint by id

```bash
csdk check-constraint get --id <value>
```
