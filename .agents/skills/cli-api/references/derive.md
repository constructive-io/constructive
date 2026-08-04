# derive

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Derive records via csdk CLI

## Usage

```bash
csdk derive list
csdk derive list --where.<field>.<op> <value> --orderBy <values>
csdk derive list --limit 10 --after <cursor>
csdk derive find-first --where.<field>.<op> <value>
csdk derive get --id <UUID>
csdk derive create --kind <String> --sourceTableId <UUID> --tableId <UUID> [--databaseId <UUID>] [--includeMutations <Boolean>] [--policyPrefix <String>]
csdk derive update --id <UUID> [--databaseId <UUID>] [--includeMutations <Boolean>] [--kind <String>] [--policyPrefix <String>] [--sourceTableId <UUID>] [--tableId <UUID>]
csdk derive delete --id <UUID>
```

## Examples

### List derive records

```bash
csdk derive list
```

### List derive records with pagination

```bash
csdk derive list --limit 10 --offset 0
```

### List derive records with cursor pagination

```bash
csdk derive list --limit 10 --after <cursor>
```

### Find first matching derive

```bash
csdk derive find-first --where.id.equalTo <value>
```

### List derive records with field selection

```bash
csdk derive list --select id,id
```

### List derive records with filtering and ordering

```bash
csdk derive list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a derive

```bash
csdk derive create --kind <String> --sourceTableId <UUID> --tableId <UUID> [--databaseId <UUID>] [--includeMutations <Boolean>] [--policyPrefix <String>]
```

### Get a derive by id

```bash
csdk derive get --id <value>
```
