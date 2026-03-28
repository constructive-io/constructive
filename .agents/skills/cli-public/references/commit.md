# commit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Commit records via csdk CLI

## Usage

```bash
csdk commit list
csdk commit list --where.<field>.<op> <value> --orderBy <values>
csdk commit list --limit 10 --after <cursor>
csdk commit find-first --where.<field>.<op> <value>
csdk commit get --id <UUID>
csdk commit create --databaseId <UUID> --storeId <UUID> [--message <String>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
csdk commit update --id <UUID> [--message <String>] [--databaseId <UUID>] [--storeId <UUID>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
csdk commit delete --id <UUID>
```

## Examples

### List commit records

```bash
csdk commit list
```

### List commit records with pagination

```bash
csdk commit list --limit 10 --offset 0
```

### List commit records with cursor pagination

```bash
csdk commit list --limit 10 --after <cursor>
```

### Find first matching commit

```bash
csdk commit find-first --where.id.equalTo <value>
```

### List commit records with field selection

```bash
csdk commit list --select id,id
```

### List commit records with filtering and ordering

```bash
csdk commit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a commit

```bash
csdk commit create --databaseId <UUID> --storeId <UUID> [--message <String>] [--parentIds <UUID>] [--authorId <UUID>] [--committerId <UUID>] [--treeId <UUID>] [--date <Datetime>]
```

### Get a commit by id

```bash
csdk commit get --id <value>
```
