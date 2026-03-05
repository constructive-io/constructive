# astMigration

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AstMigration records via app CLI

## Usage

```bash
app ast-migration list
app ast-migration get --id <value>
app ast-migration create --databaseId <value> --name <value> --requires <value> --payload <value> --deploys <value> --deploy <value> --revert <value> --verify <value> --action <value> --actionId <value> --actorId <value>
app ast-migration update --id <value> [--databaseId <value>] [--name <value>] [--requires <value>] [--payload <value>] [--deploys <value>] [--deploy <value>] [--revert <value>] [--verify <value>] [--action <value>] [--actionId <value>] [--actorId <value>]
app ast-migration delete --id <value>
```

## Examples

### List all astMigration records

```bash
app ast-migration list
```

### Create a astMigration

```bash
app ast-migration create --databaseId "value" --name "value" --requires "value" --payload "value" --deploys "value" --deploy "value" --revert "value" --verify "value" --action "value" --actionId "value" --actorId "value"
```

### Get a astMigration by id

```bash
app ast-migration get --id <value>
```
