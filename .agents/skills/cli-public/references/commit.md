# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Commit records via csdk CLI

## Usage

```bash
csdk commit list
csdk commit get --id <UUID>
csdk commit create --databaseId <UUID> --storeId <UUID> [--message <String>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
csdk commit update --id <UUID> [--message <String>] [--databaseId <UUID>] [--storeId <UUID>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
csdk commit delete --id <UUID>
```

## Examples

### List all commit records

```bash
csdk commit list
```

### Create a commit

```bash
csdk commit create --databaseId <UUID> --storeId <UUID> [--message <String>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
```

### Get a commit by id

```bash
csdk commit get --id <value>
```
