# sqlAction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SqlAction records via csdk CLI

## Usage

```bash
csdk sql-action list
csdk sql-action list --where.<field>.<op> <value> --orderBy <values>
csdk sql-action list --limit 10 --after <cursor>
csdk sql-action find-first --where.<field>.<op> <value>
csdk sql-action get --id <Int>
csdk sql-action create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-action update --id <Int> [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-action delete --id <Int>
```

## Examples

### List sqlAction records

```bash
csdk sql-action list
```

### List sqlAction records with pagination

```bash
csdk sql-action list --limit 10 --offset 0
```

### List sqlAction records with cursor pagination

```bash
csdk sql-action list --limit 10 --after <cursor>
```

### Find first matching sqlAction

```bash
csdk sql-action find-first --where.id.equalTo <value>
```

### List sqlAction records with field selection

```bash
csdk sql-action list --select id,id
```

### List sqlAction records with filtering and ordering

```bash
csdk sql-action list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a sqlAction

```bash
csdk sql-action create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
```

### Get a sqlAction by id

```bash
csdk sql-action get --id <value>
```
