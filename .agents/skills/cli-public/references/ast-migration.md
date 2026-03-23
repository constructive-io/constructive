# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AstMigration records via csdk CLI

## Usage

```bash
csdk ast-migration list
csdk ast-migration get --id <Int>
csdk ast-migration create [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk ast-migration update --id <Int> [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
csdk ast-migration delete --id <Int>
```

## Examples

### List all astMigration records

```bash
csdk ast-migration list
```

### Create a astMigration

```bash
csdk ast-migration create [--databaseId <UUID>] [--name <String>] [--requires <String>] [--payload <JSON>] [--deploys <String>] [--deploy <JSON>] [--revert <JSON>] [--verify <JSON>] [--action <String>] [--actionId <UUID>] [--actorId <UUID>]
```

### Get a astMigration by id

```bash
csdk ast-migration get --id <value>
```
