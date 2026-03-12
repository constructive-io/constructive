# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SqlMigration records via csdk CLI

## Usage

```bash
csdk sql-migration list
csdk sql-migration get --id <value>
csdk sql-migration create [--name <value>] [--databaseId <value>] [--deploy <value>] [--deps <value>] [--payload <value>] [--content <value>] [--revert <value>] [--verify <value>] [--action <value>] [--actionId <value>] [--actorId <value>]
csdk sql-migration update --id <value> [--name <value>] [--databaseId <value>] [--deploy <value>] [--deps <value>] [--payload <value>] [--content <value>] [--revert <value>] [--verify <value>] [--action <value>] [--actionId <value>] [--actorId <value>]
csdk sql-migration delete --id <value>
```

## Examples

### List all sqlMigration records

```bash
csdk sql-migration list
```

### Create a sqlMigration

```bash
csdk sql-migration create [--name <value>] [--databaseId <value>] [--deploy <value>] [--deps <value>] [--payload <value>] [--content <value>] [--revert <value>] [--verify <value>] [--action <value>] [--actionId <value>] [--actorId <value>]
```

### Get a sqlMigration by id

```bash
csdk sql-migration get --id <value>
```
