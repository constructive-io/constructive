# sqlAction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SqlAction records via csdk CLI

## Usage

```bash
csdk sql-action list
csdk sql-action get --id <Int>
csdk sql-action create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-action update --id <Int> [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-action delete --id <Int>
```

## Examples

### List all sqlAction records

```bash
csdk sql-action list
```

### Create a sqlAction

```bash
csdk sql-action create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
```

### Get a sqlAction by id

```bash
csdk sql-action get --id <value>
```
