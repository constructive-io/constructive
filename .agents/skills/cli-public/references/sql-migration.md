# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SqlMigration records via csdk CLI

## Usage

```bash
csdk sql-migration list
csdk sql-migration get --id <Int>
csdk sql-migration create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-migration update --id <Int> [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk sql-migration delete --id <Int>
```

## Examples

### List all sqlMigration records

```bash
csdk sql-migration list
```

### Create a sqlMigration

```bash
csdk sql-migration create [--name <String>] [--databaseId <UUID>] [--deploy <String>] [--deps <String>] [--payload <JSON>] [--content <String>] [--revert <String>] [--verify <String>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
```

### Get a sqlMigration by id

```bash
csdk sql-migration get --id <value>
```
