# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AstMigration records via csdk CLI

## Usage

```bash
csdk ast-migration list
csdk ast-migration list --where.<field>.<op> <value> --orderBy <values>
csdk ast-migration list --limit 10 --after <cursor>
csdk ast-migration find-first --where.<field>.<op> <value>
csdk ast-migration get --id <Int>
csdk ast-migration create [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk ast-migration update --id <Int> [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk ast-migration delete --id <Int>
```

## Examples

### List astMigration records

```bash
csdk ast-migration list
```

### List astMigration records with pagination

```bash
csdk ast-migration list --limit 10 --offset 0
```

### List astMigration records with cursor pagination

```bash
csdk ast-migration list --limit 10 --after <cursor>
```

### Find first matching astMigration

```bash
csdk ast-migration find-first --where.id.equalTo <value>
```

### List astMigration records with field selection

```bash
csdk ast-migration list --select id,id
```

### List astMigration records with filtering and ordering

```bash
csdk ast-migration list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a astMigration

```bash
csdk ast-migration create [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
```

### Get a astMigration by id

```bash
csdk ast-migration get --id <value>
```
