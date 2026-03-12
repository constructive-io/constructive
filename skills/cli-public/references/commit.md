# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Commit records via csdk CLI

## Usage

```bash
csdk commit list
csdk commit get --id <value>
csdk commit create --databaseId <value> --storeId <value> [--message <value>] [--parentIds <value>] [--authorId <value>] [--committerId <value>] [--treeId <value>] [--date <value>]
csdk commit update --id <value> [--message <value>] [--databaseId <value>] [--storeId <value>] [--parentIds <value>] [--authorId <value>] [--committerId <value>] [--treeId <value>] [--date <value>]
csdk commit delete --id <value>
```

## Examples

### List all commit records

```bash
csdk commit list
```

### Create a commit

```bash
csdk commit create --databaseId <value> --storeId <value> [--message <value>] [--parentIds <value>] [--authorId <value>] [--committerId <value>] [--treeId <value>] [--date <value>]
```

### Get a commit by id

```bash
csdk commit get --id <value>
```
