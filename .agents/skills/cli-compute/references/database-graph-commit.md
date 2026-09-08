# databaseGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DatabaseGraphCommit records via csdk CLI

## Usage

```bash
csdk database-graph-commit list
csdk database-graph-commit list --where.<field>.<op> <value> --orderBy <values>
csdk database-graph-commit list --limit 10 --after <cursor>
csdk database-graph-commit find-first --where.<field>.<op> <value>
csdk database-graph-commit get --id <UUID>
csdk database-graph-commit create --databaseId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
csdk database-graph-commit update --id <UUID> [--authorId <UUID>] [--committerId <UUID>] [--databaseId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--storeId <UUID>] [--treeId <UUID>]
csdk database-graph-commit delete --id <UUID>
```

## Examples

### List databaseGraphCommit records

```bash
csdk database-graph-commit list
```

### List databaseGraphCommit records with pagination

```bash
csdk database-graph-commit list --limit 10 --offset 0
```

### List databaseGraphCommit records with cursor pagination

```bash
csdk database-graph-commit list --limit 10 --after <cursor>
```

### Find first matching databaseGraphCommit

```bash
csdk database-graph-commit find-first --where.id.equalTo <value>
```

### List databaseGraphCommit records with field selection

```bash
csdk database-graph-commit list --select id,id
```

### List databaseGraphCommit records with filtering and ordering

```bash
csdk database-graph-commit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a databaseGraphCommit

```bash
csdk database-graph-commit create --databaseId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
```

### Get a databaseGraphCommit by id

```bash
csdk database-graph-commit get --id <value>
```
