# sqlMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SqlMigration records via app CLI

## Usage

```bash
app sql-migration list
app sql-migration get --id <value>
app sql-migration create --name <value> --databaseId <value> --deploy <value> --deps <value> --payload <value> --content <value> --revert <value> --verify <value> --action <value> --actionId <value> --actorId <value>
app sql-migration update --id <value> [--name <value>] [--databaseId <value>] [--deploy <value>] [--deps <value>] [--payload <value>] [--content <value>] [--revert <value>] [--verify <value>] [--action <value>] [--actionId <value>] [--actorId <value>]
app sql-migration delete --id <value>
```

## Examples

### List all sqlMigration records

```bash
app sql-migration list
```

### Create a sqlMigration

```bash
app sql-migration create --name "value" --databaseId "value" --deploy "value" --deps "value" --payload "value" --content "value" --revert "value" --verify "value" --action "value" --actionId "value" --actorId "value"
```

### Get a sqlMigration by id

```bash
app sql-migration get --id <value>
```
